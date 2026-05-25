import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import DetentionEvent from '../models/DetentionEvent';

const router = Router();
router.use(protect);

// GET all events
router.get('/', async (req: AuthRequest, res: Response) => {
  const events = await DetentionEvent.find({ userId: req.user._id }).sort({ clockIn: -1 }).limit(50);
  res.json({ events });
});

// POST — start new event
router.post('/start', async (req: AuthRequest, res: Response) => {
  const { location, type, loadNum, freeHours, ratePerHour } = req.body;
  if (!location) { res.status(400).json({ message: 'location is required' }); return; }

  // Only one active event at a time
  const active = await DetentionEvent.findOne({ userId: req.user._id, clockOut: { $exists: false } });
  if (active) { res.status(400).json({ message: 'You already have an active session. Stop it first.' }); return; }

  const event = await DetentionEvent.create({
    userId: req.user._id,
    location,
    type: type ?? 'Shipper',
    loadNum: loadNum ?? '',
    clockIn: new Date(),
    freeHours: freeHours ?? 2,
    ratePerHour: ratePerHour ?? 50,
  });
  res.json({ event });
});

// PUT — stop event
router.put('/:id/stop', async (req: AuthRequest, res: Response) => {
  const event = await DetentionEvent.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { clockOut: new Date() },
    { new: true }
  );
  if (!event) { res.status(404).json({ message: 'Event not found' }); return; }
  res.json({ event });
});

// PUT — edit completed event metadata (not timestamps)
router.put('/:id', async (req: AuthRequest, res: Response) => {
  const { location, type, loadNum, freeHours, ratePerHour } = req.body;
  const update: Record<string, unknown> = {};
  if (location    != null) update.location    = location;
  if (type        != null) update.type        = type;
  if (loadNum     != null) update.loadNum     = loadNum;
  if (freeHours   != null) update.freeHours   = freeHours;
  if (ratePerHour != null) update.ratePerHour = ratePerHour;
  const event = await DetentionEvent.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { $set: update },
    { new: true }
  );
  if (!event) { res.status(404).json({ message: 'Not found' }); return; }
  res.json({ event });
});

// DELETE
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  await DetentionEvent.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  res.json({ message: 'Deleted' });
});

export default router;
