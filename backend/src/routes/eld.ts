import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import ELDEntry, { ELDStatus } from '../models/ELDEntry';
import HOSEntry from '../models/HOSEntry';

const router = Router();
router.use(protect);

const VALID: ELDStatus[] = ['off_duty', 'sleeper_berth', 'driving', 'on_duty'];
const todayStr = () => new Date().toISOString().split('T')[0];

// Get entries for a date (defaults to today)
router.get('/', async (req: AuthRequest, res: Response) => {
  const date = String(req.query.date ?? todayStr());
  const entries = await ELDEntry.find({ userId: req.user._id, date }).sort({ startTime: 1 });
  res.json({ entries });
});

// Start a new status (closes any open entry first)
router.post('/', async (req: AuthRequest, res: Response) => {
  const { status, location, notes } = req.body;
  if (!VALID.includes(status)) { res.status(400).json({ message: 'Invalid status' }); return; }

  const now = new Date();
  const date = now.toISOString().split('T')[0];

  // Close the currently open entry
  await ELDEntry.findOneAndUpdate(
    { userId: req.user._id, endTime: { $exists: false } },
    { $set: { endTime: now } }
  );

  const entry = await ELDEntry.create({
    userId: req.user._id, date, status, startTime: now, location, notes,
  });
  res.status(201).json({ entry });
});

// Close current open entry (end of day / logout)
router.patch('/close', async (req: AuthRequest, res: Response) => {
  const entry = await ELDEntry.findOneAndUpdate(
    { userId: req.user._id, endTime: { $exists: false } },
    { $set: { endTime: new Date() } },
    { new: true }
  );
  res.json({ entry });
});

// Sync today's ELD to HOS entry
router.post('/sync-hos', async (req: AuthRequest, res: Response) => {
  const date = String(req.query.date ?? todayStr());
  const entries = await ELDEntry.find({ userId: req.user._id, date }).sort({ startTime: 1 });

  let drivingMs = 0;
  let onDutyMs = 0;
  const now = Date.now();

  for (const e of entries) {
    const start = e.startTime.getTime();
    const end = e.endTime ? e.endTime.getTime() : now;
    const duration = Math.max(0, end - start);
    if (e.status === 'driving') drivingMs += duration;
    if (e.status === 'driving' || e.status === 'on_duty') onDutyMs += duration;
  }

  const drivingHours = Math.min(11, Math.round((drivingMs / 3600000) * 100) / 100);
  const onDutyHours = Math.min(14, Math.round((onDutyMs / 3600000) * 100) / 100);

  const hos = await HOSEntry.findOneAndUpdate(
    { userId: req.user._id, date },
    { $set: { drivingHours, onDutyHours } },
    { upsert: true, new: true }
  );

  res.json({ hos, drivingHours, onDutyHours });
});

// Delete an entry
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  await ELDEntry.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  res.json({ message: 'Deleted' });
});

export default router;
