import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import BusinessListing from '../models/BusinessListing';
import BusinessReview from '../models/BusinessReview';

const router = Router();

// All routes require authentication + partner role
const partnerOnly = async (req: AuthRequest, res: Response, next: Function) => {
  if (!req.user || (req.user.role !== 'partner' && req.user.role !== 'admin')) {
    res.status(403).json({ message: 'Access restricted to partners only.' });
    return;
  }
  next();
};

// ── GET /api/partner/listing ─────────────────────────────────────────────────
// Returns the partner's own listing, or null if not created yet
router.get('/listing', protect, partnerOnly, async (req: AuthRequest, res: Response) => {
  try {
    const listing = await BusinessListing.findOne({ ownerId: req.user._id });
    res.json(listing ?? null);
  } catch {
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── POST /api/partner/listing ─────────────────────────────────────────────────
// Create listing (first time setup)
router.post('/listing', protect, partnerOnly, async (req: AuthRequest, res: Response) => {
  try {
    const existing = await BusinessListing.findOne({ ownerId: req.user._id });
    if (existing) {
      res.status(409).json({ message: 'Listing already exists. Use PUT to update.' });
      return;
    }
    const { businessName, category, phone, city, state, website, description, hours } = req.body;
    if (!businessName || !category || !phone || !city || !state) {
      res.status(400).json({ message: 'businessName, category, phone, city, and state are required.' });
      return;
    }
    const listing = await BusinessListing.create({
      ownerId: req.user._id,
      businessName, category, phone, city, state, website, description, hours,
    });
    res.status(201).json(listing);
  } catch {
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── PUT /api/partner/listing ──────────────────────────────────────────────────
// Update or upsert listing
router.put('/listing', protect, partnerOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { businessName, category, phone, city, state, website, description, hours, isActive } = req.body;
    const listing = await BusinessListing.findOneAndUpdate(
      { ownerId: req.user._id },
      { $set: { businessName, category, phone, city, state, website, description, hours, isActive } },
      { new: true, upsert: true, runValidators: true }
    );
    res.json(listing);
  } catch {
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── GET /api/partner/analytics ────────────────────────────────────────────────
router.get('/analytics', protect, partnerOnly, async (req: AuthRequest, res: Response) => {
  try {
    const listing = await BusinessListing.findOne({ ownerId: req.user._id }).select('viewCount clickCount rating reviewCount');
    if (!listing) {
      res.json({ viewCount: 0, clickCount: 0, rating: 0, reviewCount: 0 });
      return;
    }
    res.json({
      viewCount:   listing.viewCount,
      clickCount:  listing.clickCount,
      rating:      listing.rating,
      reviewCount: listing.reviewCount,
    });
  } catch {
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── GET /api/partner/reviews ──────────────────────────────────────────────────
router.get('/reviews', protect, partnerOnly, async (req: AuthRequest, res: Response) => {
  try {
    const listing = await BusinessListing.findOne({ ownerId: req.user._id }).select('_id');
    if (!listing) {
      res.json([]);
      return;
    }
    const reviews = await BusinessReview.find({ listingId: listing._id }).sort({ createdAt: -1 });
    res.json(reviews);
  } catch {
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── POST /api/partner/listing/view ───────────────────────────────────────────
// Called by driver app when a listing is viewed — increments view count
router.post('/listing/:listingId/view', protect, async (req: AuthRequest, res: Response) => {
  try {
    await BusinessListing.findByIdAndUpdate(req.params.listingId, { $inc: { viewCount: 1 } });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── POST /api/partner/listing/:listingId/click ────────────────────────────────
// Called by driver app when phone/website link is tapped
router.post('/listing/:listingId/click', protect, async (req: AuthRequest, res: Response) => {
  try {
    await BusinessListing.findByIdAndUpdate(req.params.listingId, { $inc: { clickCount: 1 } });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── POST /api/partner/listing/:listingId/review ───────────────────────────────
// Driver submits a review
router.post('/listing/:listingId/review', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      res.status(400).json({ message: 'Rating must be between 1 and 5.' });
      return;
    }
    const review = await BusinessReview.findOneAndUpdate(
      { listingId: req.params.listingId, driverId: req.user._id },
      { driverName: req.user.name, rating, comment },
      { new: true, upsert: true }
    );

    // Recalculate listing rating
    const reviews = await BusinessReview.find({ listingId: req.params.listingId });
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    await BusinessListing.findByIdAndUpdate(req.params.listingId, {
      rating: Math.round(avgRating * 10) / 10,
      reviewCount: reviews.length,
    });

    // Return updated listing stats so the client can update its local state
    res.json({
      rating:      Math.round(avgRating * 10) / 10,
      reviewCount: reviews.length,
    });
  } catch (err: any) {
    if (err.code === 11000) {
      res.status(409).json({ message: 'You have already reviewed this listing.' });
      return;
    }
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── GET /api/partner/listings ─────────────────────────────────────────────────
// Public: driver map fetches nearby active listings
// Query params:
//   lat, lng, radius (miles) — return listings within radius (requires lat/lng stored on listing)
//   city, state, category    — text fallback filters
router.get('/listings', async (req: AuthRequest, res: Response) => {
  try {
    const { city, state, category, lat, lng, radius } = req.query;
    const filter: Record<string, any> = { isActive: true };

    if (lat && lng) {
      // Bounding-box radius filter using stored lat/lng on listings
      const driverLat  = parseFloat(lat as string);
      const driverLng  = parseFloat(lng as string);
      const miles      = parseFloat((radius as string) ?? '50');
      const latDelta   = miles / 69;
      const lngDelta   = miles / (69 * Math.cos(driverLat * (Math.PI / 180)));
      filter.latitude  = { $gte: driverLat - latDelta, $lte: driverLat + latDelta };
      filter.longitude = { $gte: driverLng - lngDelta, $lte: driverLng + lngDelta };
    } else {
      // Text fallback when GPS not available
      if (city)  filter.city  = { $regex: new RegExp(city  as string, 'i') };
      if (state) filter.state = { $regex: new RegExp(state as string, 'i') };
    }

    if (category) filter.category = { $regex: new RegExp(category as string, 'i') };

    const listings = await BusinessListing.find(filter)
      .select('-ownerId')
      .sort({ rating: -1 })
      .limit(100);
    res.json(listings);
  } catch {
    res.status(500).json({ message: 'Server error.' });
  }
});

export default router;
