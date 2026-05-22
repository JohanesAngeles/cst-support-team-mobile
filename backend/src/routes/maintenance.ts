import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import MaintenanceRecord from '../models/MaintenanceRecord';
import TruckProfile from '../models/TruckProfile';

const router = Router();
router.use(protect);

router.get('/', async (req: AuthRequest, res: Response) => {
  const records = await MaintenanceRecord.find({ userId: req.user._id }).sort({ nextDate: 1 });
  const profile = await TruckProfile.findOne({ userId: req.user._id });
  res.json({ currentMileage: profile?.currentMileage ?? 0, records });
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const { name, icon, lastDate, nextDate, lastMiles, intervalMiles } = req.body;
  if (!name || !nextDate) { res.status(400).json({ message: 'name and nextDate required' }); return; }
  const record = await MaintenanceRecord.create({
    userId: req.user._id, name, icon: icon ?? 'construct-outline',
    lastDate: lastDate ?? new Date().toISOString().split('T')[0],
    nextDate, lastMiles: lastMiles ?? 0, intervalMiles: intervalMiles ?? 10000,
  });
  res.status(201).json(record);
});

router.put('/:id/complete', async (req: AuthRequest, res: Response) => {
  const profile = await TruckProfile.findOne({ userId: req.user._id });
  const currentMileage = profile?.currentMileage ?? 0;
  const today = new Date().toISOString().split('T')[0];
  const nextDate = new Date();
  nextDate.setMonth(nextDate.getMonth() + 3);
  const record = await MaintenanceRecord.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { lastDate: today, lastMiles: currentMileage, nextDate: nextDate.toISOString().split('T')[0] },
    { new: true }
  );
  if (!record) { res.status(404).json({ message: 'Not found' }); return; }
  res.json(record);
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const record = await MaintenanceRecord.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!record) { res.status(404).json({ message: 'Not found' }); return; }
  res.json({ message: 'Deleted' });
});

export default router;
