import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import MarketplaceListing from '../models/MarketplaceListing';

const router = Router();
router.use(protect);

const SORT_OPTIONS: Record<string, Record<string, 1 | -1>> = {
  newest:     { createdAt: -1 },
  oldest:     { createdAt: 1 },
  price_asc:  { price: 1 },
  price_desc: { price: -1 },
};

// GET /api/marketplace — browse active listings
router.get('/', async (req: AuthRequest, res: Response) => {
  const { category, state, q, condition, minPrice, maxPrice, sort } = req.query;
  const filter: Record<string, any> = { status: 'active' };
  if (category)  filter.category  = category;
  if (state)     filter.state     = { $regex: new RegExp(state as string, 'i') };
  if (q)         filter.title     = { $regex: new RegExp(q as string, 'i') };
  if (condition) filter.condition = condition;
  if (minPrice != null || maxPrice != null) {
    filter.price = {};
    if (minPrice != null) filter.price.$gte = Number(minPrice);
    if (maxPrice != null) filter.price.$lte = Number(maxPrice);
  }

  const sortKey = typeof sort === 'string' && SORT_OPTIONS[sort] ? sort : 'newest';
  const listings = await MarketplaceListing.find(filter).sort(SORT_OPTIONS[sortKey]).limit(100);
  res.json({ listings });
});

// GET /api/marketplace/mine — current user's listings (any status)
router.get('/mine', async (req: AuthRequest, res: Response) => {
  const listings = await MarketplaceListing.find({ postedBy: req.user._id }).sort({ createdAt: -1 });
  res.json({ listings });
});

// GET /api/marketplace/:id — single listing
router.get('/:id', async (req: AuthRequest, res: Response) => {
  const listing = await MarketplaceListing.findById(req.params.id);
  if (!listing) { res.status(404).json({ message: 'Not found' }); return; }
  res.json({ listing });
});

// POST /api/marketplace — create a listing
router.post('/', async (req: AuthRequest, res: Response) => {
  const {
    title, description, price, isNegotiable, category, condition,
    make, modelName, year, mileage, quantity, deliveryOption,
    photos, city, state, contactPhone,
  } = req.body;
  if (!title || price == null || !category || !condition || !city || !state) {
    res.status(400).json({ message: 'title, price, category, condition, city, and state are required' });
    return;
  }
  const listing = await MarketplaceListing.create({
    postedBy: req.user._id,
    postedByName: req.user.name,
    title, description, price, category, condition,
    isNegotiable: !!isNegotiable,
    make, modelName, year, mileage,
    quantity: quantity != null ? Number(quantity) : 1,
    deliveryOption: deliveryOption || 'Local Pickup Only',
    photos: Array.isArray(photos) ? photos.slice(0, 6) : [],
    city, state, contactPhone,
  });
  res.status(201).json({ listing });
});

// PATCH /api/marketplace/:id/sold — mark a listing sold (owner only)
router.patch('/:id/sold', async (req: AuthRequest, res: Response) => {
  const listing = await MarketplaceListing.findOneAndUpdate(
    { _id: req.params.id, postedBy: req.user._id },
    { $set: { status: 'sold' } },
    { new: true }
  );
  if (!listing) { res.status(404).json({ message: 'Not found' }); return; }
  res.json({ listing });
});

// DELETE /api/marketplace/:id — remove a listing (owner only)
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  await MarketplaceListing.findOneAndDelete({ _id: req.params.id, postedBy: req.user._id });
  res.json({ message: 'Deleted' });
});

export default router;
