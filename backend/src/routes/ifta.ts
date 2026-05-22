import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import IFTAEntry from '../models/IFTAEntry';

const router = Router();
router.use(protect);

router.get('/', async (req: AuthRequest, res: Response) => {
  const now = new Date();
  const quarter = Math.ceil((now.getMonth() + 1) / 3);
  const year = now.getFullYear();
  const entries = await IFTAEntry.find({ userId: req.user._id, quarter, year });
  const totalMiles = entries.reduce((s, e) => s + e.miles, 0);
  const totalGallons = entries.reduce((s, e) => s + e.gallons, 0);
  const totalTax = entries.reduce((s, e) => s + e.taxAmount, 0);
  res.json({ quarter, year, entries, totalMiles, totalGallons, totalTax });
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const { state, miles, gallons, taxAmount } = req.body;
  if (!state) { res.status(400).json({ message: 'state required' }); return; }
  const now = new Date();
  const quarter = Math.ceil((now.getMonth() + 1) / 3);
  const year = now.getFullYear();

  const existing = await IFTAEntry.findOne({ userId: req.user._id, state, quarter, year });
  if (existing) {
    existing.miles += Number(miles ?? 0);
    existing.gallons += Number(gallons ?? 0);
    existing.taxAmount += Number(taxAmount ?? 0);
    await existing.save();
    res.json(existing);
  } else {
    const entry = await IFTAEntry.create({ userId: req.user._id, state, miles: miles ?? 0, gallons: gallons ?? 0, taxAmount: taxAmount ?? 0, quarter, year });
    res.status(201).json(entry);
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const entry = await IFTAEntry.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!entry) { res.status(404).json({ message: 'Not found' }); return; }
  res.json({ message: 'Deleted' });
});

export default router;
