import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import ParkingReservation from '../models/ParkingReservation';

const router = Router();
router.use(protect);

router.get('/', async (req: AuthRequest, res: Response) => {
  const reservations = await ParkingReservation.find({ userId: req.user._id }).sort({ date: -1 });
  res.json({ reservations });
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const { location, date, confirmationNumber, arrivalWindow, notes, status } = req.body;
  if (!location || !date || !confirmationNumber) {
    res.status(400).json({ message: 'location, date, and confirmationNumber are required' }); return;
  }
  const reservation = await ParkingReservation.create({
    userId: req.user._id, location, date, confirmationNumber, arrivalWindow, notes, status,
  });
  res.status(201).json({ reservation });
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  const reservation = await ParkingReservation.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    req.body,
    { new: true }
  );
  if (!reservation) { res.status(404).json({ message: 'Not found' }); return; }
  res.json({ reservation });
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  await ParkingReservation.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  res.json({ message: 'Deleted' });
});

export default router;
