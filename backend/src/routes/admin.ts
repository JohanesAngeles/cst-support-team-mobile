import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import BusinessListing from '../models/BusinessListing';
import PartnerApplication from '../models/PartnerApplication';

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

export default router;
