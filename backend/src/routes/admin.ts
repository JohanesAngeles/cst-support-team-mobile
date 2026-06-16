import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import BusinessListing from '../models/BusinessListing';
import PartnerApplication from '../models/PartnerApplication';
import User from '../models/User';

const router = Router();

// All admin routes require authentication + admin role
const adminOnly = (req: AuthRequest, res: Response, next: Function) => {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ message: 'Admin access required.' });
    return;
  }
  next();
};

// ── POST /api/admin/listings/bulk ─────────────────────────────────────────────
// Bulk-insert business listings (e.g. from Truck Club Magazine)
// Body: { listings: [{ businessName, category, phone, city, state, website?, description?, hours? }] }
//
// Example JSON format for Armeda/Irish to fill in:
// {
//   "listings": [
//     { "businessName": "Mike's Truck Repair", "category": "Mechanic", "phone": "213-555-0101", "city": "Los Angeles", "state": "CA", "hours": "Mon-Sat 7am-6pm", "website": "https://mikestruck.com" },
//     { "businessName": "Desert Tire Shop", "category": "Tire Shop", "phone": "602-555-0202", "city": "Phoenix", "state": "AZ" }
//   ]
// }
router.post('/listings/bulk', protect, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { listings } = req.body;
    if (!Array.isArray(listings) || listings.length === 0) {
      res.status(400).json({ message: 'listings array is required and must not be empty.' });
      return;
    }

    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const item of listings) {
      const { businessName, category, phone, city, state, website, description, hours } = item;

      if (!businessName || !category || !phone || !city || !state) {
        errors.push(`Skipped "${businessName ?? 'unnamed'}": missing required field(s).`);
        skipped++;
        continue;
      }

      try {
        // Use a placeholder ownerId for magazine-imported listings (use admin's own id)
        await BusinessListing.create({
          ownerId:      req.user._id,
          businessName: businessName.trim(),
          category:     category.trim(),
          phone:        phone.trim(),
          city:         city.trim(),
          state:        state.trim().toUpperCase(),
          website:      website?.trim()     || undefined,
          description:  description?.trim() || undefined,
          hours:        hours?.trim()        || undefined,
          isActive:     true,
        });
        created++;
      } catch (err: any) {
        // E11000 = duplicate key (same ownerId) — skip
        if (err.code === 11000) {
          errors.push(`Skipped "${businessName}": duplicate entry.`);
          skipped++;
        } else {
          errors.push(`Failed "${businessName}": ${err.message}`);
          skipped++;
        }
      }
    }

    res.status(201).json({
      message: `Bulk import complete.`,
      created,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Server error during bulk import.' });
  }
});

// ── GET /api/admin/listings ───────────────────────────────────────────────────
// Get all listings (for admin review)
router.get('/listings', protect, adminOnly, async (_req: AuthRequest, res: Response) => {
  try {
    const listings = await BusinessListing.find().sort({ createdAt: -1 });
    res.json(listings);
  } catch {
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── GET /api/admin/applications ───────────────────────────────────────────────
// Get all partner applications
router.get('/applications', protect, adminOnly, async (_req: AuthRequest, res: Response) => {
  try {
    const apps = await PartnerApplication.find().sort({ createdAt: -1 });
    res.json(apps);
  } catch {
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── PATCH /api/admin/applications/:id ────────────────────────────────────────
// Approve or reject a partner application
router.patch('/applications/:id', protect, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      res.status(400).json({ message: 'status must be "approved" or "rejected".' });
      return;
    }
    const app = await PartnerApplication.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!app) { res.status(404).json({ message: 'Application not found.' }); return; }
    res.json(app);
  } catch {
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── PATCH /api/admin/listings/:id ────────────────────────────────────────────
// Toggle isActive or update any listing field
router.patch('/listings/:id', protect, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const listing = await BusinessListing.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!listing) { res.status(404).json({ message: 'Listing not found.' }); return; }
    res.json(listing);
  } catch {
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── DELETE /api/admin/listings/:id ───────────────────────────────────────────
// Remove a listing
router.delete('/listings/:id', protect, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    await BusinessListing.findByIdAndDelete(req.params.id);
    res.json({ message: 'Listing deleted.' });
  } catch {
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── GET /api/admin/cashapp-requests ──────────────────────────────────────────
// List partners who have submitted a Cash App payment
router.get('/cashapp-requests', protect, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const pending = await User.find({ cashAppPending: true })
      .select('name email cashAppPendingPlan cashAppPendingAt subscriptionStatus')
      .sort({ cashAppPendingAt: -1 });
    res.json(pending);
  } catch {
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── POST /api/admin/cashapp-approve/:userId ───────────────────────────────────
// Admin manually activates a partner subscription after confirming Cash App payment
router.post('/cashapp-approve/:userId', protect, adminOnly, async (req: AuthRequest, res: Response) => {
  const { plan } = req.body as { plan: 'monthly' | 'annual' };
  if (!['monthly', 'annual'].includes(plan)) {
    res.status(400).json({ message: 'Invalid plan.' }); return;
  }
  try {
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + (plan === 'annual' ? 12 : 1));
    await User.findByIdAndUpdate(req.params.userId, {
      subscriptionStatus: 'active',
      subscriptionPlan: plan,
      subscriptionEnd: expiry,
      cashAppPending: false,
      cashAppPendingPlan: null,
    });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ message: 'Server error.' });
  }
});

export default router;
