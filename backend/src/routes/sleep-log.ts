import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import SleepLog from '../models/SleepLog';

const router = Router();
router.use(protect);

router.get('/', async (req: AuthRequest, res: Response) => {
  const logs = await SleepLog.find({ userId: req.user._id }).sort({ date: -1 }).limit(30);
  res.json({ logs });
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const { date, sleepStart, sleepEnd, sleepHours, quality, location, notes } = req.body;
  if (!date || !sleepStart || !sleepEnd || sleepHours == null || !quality) {
    res.status(400).json({ message: 'date, sleepStart, sleepEnd, sleepHours, and quality are required' }); return;
  }
  const log = await SleepLog.findOneAndUpdate(
    { userId: req.user._id, date },
    { sleepStart, sleepEnd, sleepHours, quality, location, notes },
    { upsert: true, new: true }
  );
  res.status(201).json({ log });
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  await SleepLog.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  res.json({ message: 'Deleted' });
});

export default router;
