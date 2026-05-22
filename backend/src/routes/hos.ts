import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import HOSEntry from '../models/HOSEntry';

const router = Router();
router.use(protect);

// GET last 10 entries
router.get('/', async (req: AuthRequest, res: Response) => {
  const entries = await HOSEntry.find({ userId: req.user._id })
    .sort({ date: -1 })
    .limit(10);
  res.json({ entries });
});

// POST — upsert by date
router.post('/', async (req: AuthRequest, res: Response) => {
  const { date, drivingHours, onDutyHours, notes } = req.body;
  if (!date || drivingHours == null || onDutyHours == null) {
    res.status(400).json({ message: 'date, drivingHours, and onDutyHours are required' }); return;
  }
  const entry = await HOSEntry.findOneAndUpdate(
    { userId: req.user._id, date },
    { drivingHours, onDutyHours, notes: notes ?? '' },
    { upsert: true, new: true }
  );
  res.json({ entry });
});

// DELETE
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  await HOSEntry.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  res.json({ message: 'Deleted' });
});

export default router;
