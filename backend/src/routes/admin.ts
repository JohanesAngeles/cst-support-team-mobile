import crypto from 'crypto';
import mongoose from 'mongoose';
import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import BusinessListing from '../models/BusinessListing';
import PartnerApplication from '../models/PartnerApplication';
import UniversityApplication from '../models/UniversityApplication';
import User from '../models/User';
import UserStatusLog from '../models/UserStatusLog';
import { getOrCreateConfig } from '../models/AppConfig';
import Sponsor from '../models/Sponsor';
import SponsoredPost from '../models/SponsoredPost';
import NewsItem from '../models/NewsItem';
import MapReport from '../models/MapReport';
import Report from '../models/Report';
import NetworkPost from '../models/NetworkPost';
import CDLDoc from '../models/CDLDoc';
import CashAppPayment from '../models/CashAppPayment';
import MarketplaceListing from '../models/MarketplaceListing';
import MarketplaceReview from '../models/MarketplaceReview';
import BrokerBlacklist from '../models/BrokerBlacklist';
import LiveSession from '../models/LiveSession';
import Story from '../models/Story';
import Group from '../models/Group';
import ConvoyLocation from '../models/ConvoyLocation';
import Event from '../models/Event';
import ChatMessage from '../models/ChatMessage';
import { geocodeAddress } from '../utils/geocode';
import {
  sendPartnerWelcomeEmail, sendPartnerRejectedEmail,
  sendUniversityApplicationApprovedEmail, sendUniversityApplicationRejectedEmail,
} from '../utils/email';

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
        const query = `${city.trim()}, ${state.trim()}, USA`;
        const coords = await geocodeAddress(query);
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
          latitude:     coords?.latitude,
          longitude:    coords?.longitude,
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
// Approve or reject a partner application.
// On approval: creates a partner User + BusinessListing and emails credentials.
// Idempotent — re-approving an already-approved email is a no-op.
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

    if (status === 'approved') {
      const existing = await User.findOne({ email: app.email });
      if (!existing) {
        // Generate a readable temp password: e.g. "RoadA3F7B2C1"
        const tempPassword = 'Road' + crypto.randomBytes(4).toString('hex').toUpperCase();

        const user = await User.create({
          name:               app.contactName,
          email:              app.email,
          phone:              app.phone,
          password:           tempPassword,
          role:               'partner',
          isVerified:         true,
          subscriptionStatus: 'free',
        });

        // Pre-create their listing so it's ready when they log in
        const coords = await geocodeAddress(`${app.city}, ${app.state}, USA`).catch(() => null);
        await BusinessListing.create({
          ownerId:      user._id,
          businessName: app.businessName,
          category:     app.category,
          phone:        app.phone,
          city:         app.city,
          state:        app.state,
          website:      app.website,
          description:  app.description,
          isActive:     true,
          latitude:     coords?.latitude,
          longitude:    coords?.longitude,
        });

        // Email them their credentials (fire-and-forget — don't block the response)
        sendPartnerWelcomeEmail(app.email, app.contactName, app.businessName, tempPassword)
          .catch(err => console.error('[partner-welcome-email]', err));
      }
    }

    if (status === 'rejected') {
      sendPartnerRejectedEmail(app.email, app.contactName, app.businessName)
        .catch(err => console.error('[partner-rejected-email]', err));
    }

    res.json(app);
  } catch {
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── GET /api/admin/university-applications ───────────────────────────────────
// Get all Owner Operator University applications
router.get('/university-applications', protect, adminOnly, async (_req: AuthRequest, res: Response) => {
  try {
    const apps = await UniversityApplication.find().sort({ createdAt: -1 });
    res.json(apps);
  } catch {
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── PATCH /api/admin/university-applications/:id ─────────────────────────────
// Approve or reject an Owner Operator University application and email the applicant.
router.patch('/university-applications/:id', protect, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      res.status(400).json({ message: 'status must be "approved" or "rejected".' });
      return;
    }

    const app = await UniversityApplication.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!app) { res.status(404).json({ message: 'Application not found.' }); return; }

    if (status === 'approved') {
      sendUniversityApplicationApprovedEmail(app.email, app.name)
        .catch(err => console.error('[university-approved-email]', err));
    }

    if (status === 'rejected') {
      sendUniversityApplicationRejectedEmail(app.email, app.name)
        .catch(err => console.error('[university-rejected-email]', err));
    }

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

// ── POST /api/admin/listings/geocode-missing ─────────────────────────────────
// Backfill lat/lng for any listings that don't have coordinates yet
router.post('/listings/geocode-missing', protect, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const missing = await BusinessListing.find({
      $or: [{ latitude: { $exists: false } }, { latitude: null }],
    }).select('_id businessName city state physicalAddress');

    let updated = 0;
    let failed  = 0;

    for (const listing of missing) {
      const query = listing.physicalAddress
        ? `${listing.physicalAddress}, ${listing.city}, ${listing.state}, USA`
        : `${listing.city}, ${listing.state}, USA`;
      const coords = await geocodeAddress(query);
      if (coords) {
        await BusinessListing.findByIdAndUpdate(listing._id, {
          latitude: coords.latitude, longitude: coords.longitude,
        });
        updated++;
      } else {
        failed++;
      }
    }

    res.json({ message: 'Geocode backfill complete.', updated, failed, total: missing.length });
  } catch {
    res.status(500).json({ message: 'Server error during geocode backfill.' });
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
// List Cash App payments awaiting verification — reference number, sender
// cashtag, and screenshot are all required at submission (see billing.ts).
router.get('/cashapp-requests', protect, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const pending = await CashAppPayment.find({ status: 'pending' })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });
    res.json(pending);
  } catch {
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── POST /api/admin/cashapp-approve/:paymentId ────────────────────────────────
// Admin manually activates a partner subscription after confirming the Cash App
// payment against their own account activity feed. Idempotent.
router.post('/cashapp-approve/:paymentId', protect, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const payment = await CashAppPayment.findById(req.params.paymentId);
    if (!payment) { res.status(404).json({ message: 'Payment not found.' }); return; }
    if (payment.status === 'paid') { res.json({ ok: true }); return; }

    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + (payment.plan === 'annual' ? 12 : 1));

    payment.status = 'paid';
    payment.paidAt = new Date();
    payment.verifiedBy = req.user._id;
    await payment.save();

    await User.findByIdAndUpdate(payment.userId, {
      subscriptionStatus: 'active',
      subscriptionPlan: payment.plan,
      subscriptionEnd: expiry,
      subscriptionSource: 'cashapp',
      cashAppPending: false,
      cashAppPendingPlan: null,
    });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── POST /api/admin/cashapp-reject/:paymentId ─────────────────────────────────
// Admin rejects a Cash App submission (e.g. no matching transaction found).
router.post('/cashapp-reject/:paymentId', protect, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const payment = await CashAppPayment.findByIdAndUpdate(
      req.params.paymentId,
      { status: 'rejected', verifiedBy: req.user._id },
      { new: true }
    );
    if (!payment) { res.status(404).json({ message: 'Payment not found.' }); return; }

    await User.findByIdAndUpdate(payment.userId, {
      cashAppPending: false,
      cashAppPendingPlan: null,
    });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── GET /api/admin/config ─────────────────────────────────────────────────────
// Read the current app config (maintenance mode, min version, feature flags).
router.get('/config', protect, adminOnly, async (_req: AuthRequest, res: Response) => {
  try {
    const config = await getOrCreateConfig();
    res.json(config);
  } catch {
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── PATCH /api/admin/config ───────────────────────────────────────────────────
// Update maintenance mode, min version, store URLs, or feature flags.
router.patch('/config', protect, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const config = await getOrCreateConfig();
    const { maintenanceMode, maintenanceMessage, minVersion, storeUrls, featureFlags } = req.body;
    if (maintenanceMode !== undefined) config.maintenanceMode = maintenanceMode;
    if (maintenanceMessage !== undefined) config.maintenanceMessage = maintenanceMessage;
    if (minVersion !== undefined) config.minVersion = { ...config.minVersion, ...minVersion };
    if (storeUrls !== undefined) config.storeUrls = { ...config.storeUrls, ...storeUrls };
    if (featureFlags !== undefined) {
      for (const [key, value] of Object.entries(featureFlags)) {
        config.featureFlags.set(key, Boolean(value));
      }
    }
    await config.save();
    res.json(config);
  } catch {
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── DELETE /api/admin/config/feature-flags/:key ───────────────────────────────
// Remove a feature flag entirely.
router.delete('/config/feature-flags/:key', protect, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const config = await getOrCreateConfig();
    config.featureFlags.delete(String(req.params.key));
    await config.save();
    res.json(config);
  } catch {
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── Sponsors (ticker) CRUD ─────────────────────────────────────────────────────
router.get('/sponsors', protect, adminOnly, async (_req: AuthRequest, res: Response) => {
  try {
    const sponsors = await Sponsor.find().sort({ order: 1 });
    res.json({ sponsors });
  } catch {
    res.status(500).json({ message: 'Server error.' });
  }
});

router.post('/sponsors', protect, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { name, logoUrl, linkUrl, active, order } = req.body;
    if (!name) { res.status(400).json({ message: 'name is required.' }); return; }
    const sponsor = await Sponsor.create({ name, logoUrl, linkUrl, active, order });
    res.status(201).json({ sponsor });
  } catch {
    res.status(500).json({ message: 'Server error.' });
  }
});

router.patch('/sponsors/:id', protect, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const sponsor = await Sponsor.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });
    if (!sponsor) { res.status(404).json({ message: 'Sponsor not found.' }); return; }
    res.json({ sponsor });
  } catch {
    res.status(500).json({ message: 'Server error.' });
  }
});

router.delete('/sponsors/:id', protect, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    await Sponsor.findByIdAndDelete(req.params.id);
    res.json({ message: 'Sponsor deleted.' });
  } catch {
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── Sponsored / boosted posts CRUD ──────────────────────────────────────────────
router.get('/sponsored-posts', protect, adminOnly, async (_req: AuthRequest, res: Response) => {
  try {
    const posts = await SponsoredPost.find().sort({ createdAt: -1 });
    res.json({ posts });
  } catch {
    res.status(500).json({ message: 'Server error.' });
  }
});

router.post('/sponsored-posts', protect, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { sponsorName, sponsorLogoUrl, imageUrl, body, ctaLabel, ctaUrl, active } = req.body;
    if (!sponsorName || !body || !ctaLabel || !ctaUrl) {
      res.status(400).json({ message: 'sponsorName, body, ctaLabel, and ctaUrl are required.' }); return;
    }
    const post = await SponsoredPost.create({ sponsorName, sponsorLogoUrl, imageUrl, body, ctaLabel, ctaUrl, active });
    res.status(201).json({ post });
  } catch {
    res.status(500).json({ message: 'Server error.' });
  }
});

router.patch('/sponsored-posts/:id', protect, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const post = await SponsoredPost.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });
    if (!post) { res.status(404).json({ message: 'Sponsored post not found.' }); return; }
    res.json({ post });
  } catch {
    res.status(500).json({ message: 'Server error.' });
  }
});

router.delete('/sponsored-posts/:id', protect, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    await SponsoredPost.findByIdAndDelete(req.params.id);
    res.json({ message: 'Sponsored post deleted.' });
  } catch {
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── GET /api/admin/users ───────────────────────────────────────────────────────
// Search/list users for account management.
router.get('/users', protect, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const search = String(req.query.search ?? '').trim();
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? '25'), 10) || 25));

    const filter = search
      ? { $or: [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }] }
      : {};

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('name email role status statusReason subscriptionStatus lastActiveAt createdAt')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    res.json({ users, total, page, limit });
  } catch {
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── GET /api/admin/users/:id ───────────────────────────────────────────────────
// Full profile detail for a single user (admin view).
router.get('/users/:id', protect, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.params.id).select(
      'name email phone role status statusReason statusUpdatedAt isVerified isTopDriver cdlVerified ' +
      'truckType yearsDriving homeBase cdlClass subscriptionStatus subscriptionPlan subscriptionEnd ' +
      'lastActiveAt createdAt'
    );
    if (!user) { res.status(404).json({ message: 'User not found.' }); return; }
    res.json({ user });
  } catch {
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── GET /api/admin/users/:id/status-log ───────────────────────────────────────
// Audit trail of every suspend/ban/reactivate action taken on this user.
router.get('/users/:id/status-log', protect, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const log = await UserStatusLog.find({ userId: String(req.params.id) }).sort({ createdAt: -1 }).limit(100);
    res.json({ log });
  } catch {
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── PATCH /api/admin/users/:id/status ─────────────────────────────────────────
// Suspend, ban, or reactivate a user account. Every change is written to
// UserStatusLog so admins can see who did what to an account, and when.
router.patch('/users/:id/status', protect, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { status, reason } = req.body as { status: 'active' | 'suspended' | 'banned'; reason?: string };
    if (!['active', 'suspended', 'banned'].includes(status)) {
      res.status(400).json({ message: 'status must be active, suspended, or banned.' }); return;
    }
    const before = await User.findById(req.params.id).select('status');
    if (!before) { res.status(404).json({ message: 'User not found.' }); return; }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status, statusReason: reason ?? undefined, statusUpdatedAt: new Date() },
      { new: true }
    ).select('name email role status statusReason');

    await UserStatusLog.create({
      userId: String(req.params.id),
      fromStatus: before.status ?? 'active',
      toStatus: status,
      reason,
      changedById: req.user._id,
      changedByName: req.user.name,
    });

    res.json({ user });
  } catch {
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── GET /api/admin/users/:id/cdl-docs ─────────────────────────────────────────
// The driver's self-submitted CDL/company documents, for an admin to review
// before granting the CDL-verified badge.
router.get('/users/:id/cdl-docs', protect, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const docs = await CDLDoc.find({ userId: req.params.id }).sort({ expirationDate: 1 });
    res.json({ docs });
  } catch {
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── PATCH /api/admin/users/:id/cdl-verify ─────────────────────────────────────
// Toggle the CDL-verified badge after an admin reviews the driver's submitted
// CDL/company documents (see cdl-docs.ts) — this is a manual trust signal, not
// an automated check.
router.patch('/users/:id/cdl-verify', protect, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { verified } = req.body as { verified: boolean };
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { cdlVerified: !!verified, cdlVerifiedAt: verified ? new Date() : undefined },
      { new: true }
    ).select('name email cdlVerified cdlVerifiedAt');
    if (!user) { res.status(404).json({ message: 'User not found.' }); return; }
    res.json({ user });
  } catch {
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── GET /api/admin/news ─────────────────────────────────────────────────────────
router.get('/news', protect, adminOnly, async (_req: AuthRequest, res: Response) => {
  try {
    const news = await NewsItem.find().sort({ createdAt: -1 }).limit(100);
    res.json({ news });
  } catch {
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── POST /api/admin/news ────────────────────────────────────────────────────────
// Admin-authored News post (in addition to the regular user-facing POST /api/news).
router.post('/news', protect, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { title, body, imageUrl } = req.body;
    if (!title || !body) { res.status(400).json({ message: 'title and body are required.' }); return; }
    const item = await NewsItem.create({
      authorId: req.user._id, authorName: req.user.name, authorAvatarUrl: req.user.avatarUrl,
      title, body, imageUrl, upvotes: [],
    });
    res.status(201).json({ news: item });
  } catch {
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── PATCH /api/admin/news/:id ─────────────────────────────────────────────────
// Edit a Trucking News post directly (no ownership restriction, unlike the public route).
router.patch('/news/:id', protect, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { title, body, imageUrl } = req.body;
    const item = await NewsItem.findByIdAndUpdate(
      req.params.id,
      { $set: { title, body, imageUrl } },
      { new: true, runValidators: true }
    );
    if (!item) { res.status(404).json({ message: 'News item not found.' }); return; }
    res.json({ news: item });
  } catch {
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── DELETE /api/admin/news/:id ─────────────────────────────────────────────────
// Moderate a Trucking News post directly (no prior user report required).
router.delete('/news/:id', protect, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    await NewsItem.findByIdAndDelete(req.params.id);
    res.json({ message: 'News item deleted.' });
  } catch {
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── GET /api/admin/map-reports ────────────────────────────────────────────────
router.get('/map-reports', protect, adminOnly, async (_req: AuthRequest, res: Response) => {
  try {
    const reports = await MapReport.find().sort({ createdAt: -1 }).limit(100);
    res.json({ reports });
  } catch {
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── POST /api/admin/map-reports ───────────────────────────────────────────────
// Admin-authored Road Intel alert (in addition to the regular user-facing POST /api/map/reports).
router.post('/map-reports', protect, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { type, lat, lng, title, description, hazardType } = req.body;
    if (!type || lat == null || lng == null || !title) {
      res.status(400).json({ message: 'type, lat, lng and title are required.' }); return;
    }
    const report = await MapReport.create({
      userId: req.user._id, userName: req.user.name,
      type, lat, lng, title, description, hazardType,
      upvotes: 0, upvotedBy: [],
    });
    res.status(201).json({ report });
  } catch {
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── PATCH /api/admin/map-reports/:id ──────────────────────────────────────────
// Edit a Road Intel report directly (no ownership restriction).
router.patch('/map-reports/:id', protect, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, type, hazardType } = req.body;
    const report = await MapReport.findByIdAndUpdate(
      req.params.id,
      { $set: { title, description, type, hazardType } },
      { new: true, runValidators: true }
    );
    if (!report) { res.status(404).json({ message: 'Road Intel report not found.' }); return; }
    res.json({ report });
  } catch {
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── DELETE /api/admin/map-reports/:id ─────────────────────────────────────────
// Moderate a Road Intel report directly (no prior user report required).
router.delete('/map-reports/:id', protect, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    await MapReport.findByIdAndDelete(req.params.id);
    res.json({ message: 'Road Intel report deleted.' });
  } catch {
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── Marketplace moderation ──────────────────────────────────────────────────────
router.get('/marketplace', protect, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { search, status } = req.query;
    const filter: Record<string, unknown> = {};
    if (search) filter.title = { $regex: String(search), $options: 'i' };
    if (status) filter.status = status;
    const listings = await MarketplaceListing.find(filter).sort({ createdAt: -1 }).limit(200);
    res.json({ listings });
  } catch {
    res.status(500).json({ message: 'Server error.' });
  }
});

router.patch('/marketplace/:id', protect, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const listing = await MarketplaceListing.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!listing) { res.status(404).json({ message: 'Listing not found.' }); return; }
    res.json({ listing });
  } catch {
    res.status(500).json({ message: 'Server error.' });
  }
});

router.delete('/marketplace/:id', protect, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const listing = await MarketplaceListing.findByIdAndDelete(req.params.id);
    if (listing) await MarketplaceReview.deleteMany({ listingId: listing._id });
    res.json({ message: 'Listing deleted.' });
  } catch {
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── Broker Blacklist moderation ─────────────────────────────────────────────────
router.get('/broker-blacklist', protect, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { search } = req.query;
    const filter: Record<string, unknown> = {};
    if (search) filter.brokerName = { $regex: String(search), $options: 'i' };
    const entries = await BrokerBlacklist.find(filter).sort({ createdAt: -1 }).limit(200);
    res.json({ entries });
  } catch {
    res.status(500).json({ message: 'Server error.' });
  }
});

router.delete('/broker-blacklist/:id', protect, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    await BrokerBlacklist.findByIdAndDelete(req.params.id);
    res.json({ message: 'Entry deleted.' });
  } catch {
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── Posts moderation (Feed / ShortClips / hashtags) ─────────────────────────────
// Proactive browse+delete, unlike the Reports queue which only surfaces reported posts.
router.get('/posts', protect, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { search, hashtag, hasVideo, category } = req.query;
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? '25'), 10) || 25));

    const filter: Record<string, unknown> = {};
    if (search) {
      const re = { $regex: String(search), $options: 'i' };
      filter.$or = [{ title: re }, { body: re }];
    }
    if (hashtag) filter.hashtags = String(hashtag).toLowerCase();
    if (hasVideo === '1' || hasVideo === 'true') filter.videoUrl = { $exists: true, $ne: null };
    if (category) filter.category = category;

    const [posts, total] = await Promise.all([
      NetworkPost.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      NetworkPost.countDocuments(filter),
    ]);

    res.json({ posts, total, page, limit });
  } catch {
    res.status(500).json({ message: 'Server error.' });
  }
});

router.delete('/posts/:id', protect, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    await NetworkPost.findByIdAndDelete(req.params.id);
    res.json({ message: 'Post deleted.' });
  } catch {
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── Live Sessions moderation (GoLive / LiveView) ─────────────────────────────────
router.get('/live-sessions', protect, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query;
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    const sessions = await LiveSession.find(filter).sort({ startedAt: -1 }).limit(100);
    res.json({ sessions });
  } catch {
    res.status(500).json({ message: 'Server error.' });
  }
});

// Admin override of the host-only end endpoint in live.ts — no hostId restriction.
router.post('/live-sessions/:id/end', protect, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const session = await LiveSession.findByIdAndUpdate(
      req.params.id,
      { status: 'ended', endedAt: new Date() },
      { new: true }
    );
    if (!session) { res.status(404).json({ message: 'Live session not found.' }); return; }
    res.json({ session });
  } catch {
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── Stories moderation ───────────────────────────────────────────────────────────
router.get('/stories', protect, adminOnly, async (_req: AuthRequest, res: Response) => {
  try {
    const stories = await Story.find().sort({ createdAt: -1 }).limit(200);
    res.json({ stories });
  } catch {
    res.status(500).json({ message: 'Server error.' });
  }
});

router.delete('/stories/:id', protect, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    await Story.findByIdAndDelete(req.params.id);
    res.json({ message: 'Story deleted.' });
  } catch {
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── Convoys moderation ───────────────────────────────────────────────────────────
router.get('/convoys', protect, adminOnly, async (_req: AuthRequest, res: Response) => {
  try {
    const groups = await Group.find({ type: 'convoy' }).sort({ createdAt: -1 }).limit(200);
    const convoys = groups.map(g => ({
      _id: g._id,
      name: g.name,
      description: g.description,
      creatorName: g.creatorName,
      memberCount: g.members.length,
      originCity: g.originCity,
      destinationCity: g.destinationCity,
      departureAt: g.departureAt,
      createdAt: g.createdAt,
    }));
    res.json({ convoys });
  } catch {
    res.status(500).json({ message: 'Server error.' });
  }
});

router.delete('/convoys/:id', protect, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const group = await Group.findOneAndDelete({ _id: req.params.id, type: 'convoy' });
    if (group) await ConvoyLocation.deleteMany({ groupId: group._id });
    res.json({ message: 'Convoy disbanded.' });
  } catch {
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── Events moderation ────────────────────────────────────────────────────────────
router.get('/events', protect, adminOnly, async (_req: AuthRequest, res: Response) => {
  try {
    const events = await Event.find().sort({ date: -1 }).limit(200);
    res.json({ events });
  } catch {
    res.status(500).json({ message: 'Server error.' });
  }
});

router.delete('/events/:id', protect, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    await Event.findByIdAndDelete(req.params.id);
    res.json({ message: 'Event deleted.' });
  } catch {
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── CB Lounge moderation ─────────────────────────────────────────────────────────
router.get('/chat-channels/:channelId', protect, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const messages = await ChatMessage.find({ channelId: req.params.channelId }).sort({ createdAt: -1 }).limit(200);
    res.json({ messages });
  } catch {
    res.status(500).json({ message: 'Server error.' });
  }
});

router.delete('/chat-messages/:id', protect, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    await ChatMessage.findByIdAndDelete(req.params.id);
    res.json({ message: 'Message deleted.' });
  } catch {
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── GET /api/admin/health ──────────────────────────────────────────────────────
// Basic system health/uptime snapshot for the admin dashboard.
router.get('/health', protect, adminOnly, async (_req: AuthRequest, res: Response) => {
  try {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [users, posts, openReports, activeToday] = await Promise.all([
      User.countDocuments(),
      NetworkPost.countDocuments(),
      Report.countDocuments({ status: 'open' }),
      User.countDocuments({ lastActiveAt: { $gte: dayAgo } }),
    ]);
    res.json({
      uptimeSeconds: process.uptime(),
      dbConnected: mongoose.connection.readyState === 1,
      memoryMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
      counts: { users, posts, openReports, activeToday },
    });
  } catch {
    res.status(500).json({ message: 'Server error.' });
  }
});

export default router;
