import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import HOSEntry from '../models/HOSEntry';
import { sendPushToUser } from './notifications';

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

  // Send push alerts based on cycle usage
  const recentEntries = await HOSEntry.find({ userId: req.user._id }).sort({ date: -1 }).limit(8);
  const cycleTotal = recentEntries.reduce((sum, e) => sum + e.onDutyHours, 0);
  const cycleLimit = 70; // default 70/8-day; conservative
  const remaining = cycleLimit - cycleTotal;
  if (remaining <= 0) {
    sendPushToUser(req.user._id.toString(), '🚨 34-Hour Restart Required', 'Your 70-hr cycle is exhausted. Take a 34-hr consecutive off-duty break before driving.', 'hosReminders');
  } else if (remaining <= 10) {
    sendPushToUser(req.user._id.toString(), '⚠️ Low Cycle Hours', `Only ${remaining.toFixed(1)} hrs left in your 70-hr cycle.`, 'hosReminders');
  }

  res.json({ entry });
});

// DELETE
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  await HOSEntry.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  res.json({ message: 'Deleted' });
});

export default router;
