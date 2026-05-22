import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import TripLog from '../models/TripLog';

const router = Router();
router.use(protect);

router.get('/', async (req: AuthRequest, res: Response) => {
  const trips = await TripLog.find({ userId: req.user._id }).sort({ date: -1, createdAt: -1 });
  res.json({ trips });
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const { date, origin, destination, miles, loadNum, rate, broker, notes, status } = req.body;
  if (!date || !origin || !destination || miles == null) {
    res.status(400).json({ message: 'date, origin, destination, and miles are required' }); return;
  }
  const trip = await TripLog.create({
    userId: req.user._id, date, origin, destination,
    miles, loadNum, rate, broker, notes, status,
  });
  res.status(201).json({ trip });
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  const trip = await TripLog.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    req.body,
    { new: true }
  );
  if (!trip) { res.status(404).json({ message: 'Trip not found' }); return; }
  res.json({ trip });
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  await TripLog.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  res.json({ message: 'Deleted' });
});

export default router;
