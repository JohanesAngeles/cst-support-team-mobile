import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import FuelStop from '../models/FuelStop';
import IFTAEntry from '../models/IFTAEntry';
import TruckProfile from '../models/TruckProfile';

const router = Router();
router.use(protect);

router.get('/', async (req: AuthRequest, res: Response) => {
  const stops = await FuelStop.find({ userId: req.user._id }).sort({ date: -1, createdAt: -1 });
  const totalGallons = stops.reduce((s, f) => s + f.gallons, 0);
  const totalSpent   = stops.reduce((s, f) => s + f.gallons * f.pricePerGallon, 0);
  const avgPrice     = totalGallons > 0 ? totalSpent / totalGallons : 0;
  res.json({ stops, totalGallons, totalSpent, avgPrice });
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const { date, location, state, gallons, pricePerGallon, odometer, notes, receiptUrl } = req.body;
  if (!date || !location || !state || gallons == null || pricePerGallon == null) {
    res.status(400).json({ message: 'date, location, state, gallons, and pricePerGallon are required' }); return;
  }
  const stop = await FuelStop.create({
    userId: req.user._id, date, location, state, gallons, pricePerGallon, odometer: odometer ?? 0, notes, receiptUrl: receiptUrl || '',
  });

  // Auto-sync IFTA: upsert state gallons for the current quarter
  const now = new Date();
  const quarter = Math.ceil((now.getMonth() + 1) / 3);
  const year = now.getFullYear();
  const existing = await IFTAEntry.findOne({ userId: req.user._id, state, quarter, year });
  if (existing) {
    existing.gallons += Number(gallons);
    await existing.save();
  } else {
    await IFTAEntry.create({ userId: req.user._id, state, miles: 0, gallons: Number(gallons), taxAmount: 0, quarter, year });
  }

  // Auto-sync mileage: update TruckProfile if this odometer reading is higher
  if (odometer && Number(odometer) > 0) {
    await TruckProfile.findOneAndUpdate(
      { userId: req.user._id, currentMileage: { $lt: Number(odometer) } },
      { currentMileage: Number(odometer) }
    );
  }

  res.status(201).json({ stop });
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  const { date, location, state, gallons, pricePerGallon, odometer, notes, receiptUrl } = req.body;
  const stop = await FuelStop.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { $set: { date, location, state, gallons, pricePerGallon, odometer: odometer ?? 0, notes, receiptUrl: receiptUrl ?? undefined } },
    { new: true }
  );
  if (!stop) { res.status(404).json({ message: 'Not found' }); return; }
  res.json({ stop });
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  await FuelStop.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  res.json({ message: 'Deleted' });
});

export default router;
