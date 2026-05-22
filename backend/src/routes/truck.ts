import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import TruckProfile from '../models/TruckProfile';

const router = Router();
router.use(protect);

router.get('/', async (req: AuthRequest, res: Response) => {
  const profile = await TruckProfile.findOneAndUpdate(
    { userId: req.user._id },
    { $setOnInsert: { userId: req.user._id } },
    { upsert: true, new: true }
  );
  res.json(profile);
});

router.put('/', async (req: AuthRequest, res: Response) => {
  const { currentMileage, mpg, cheapestFuelPrice, idleHours, fuelCardConnected } = req.body;
  const update: Record<string, unknown> = {};
  if (currentMileage != null) update.currentMileage = currentMileage;
  if (mpg != null) update.mpg = mpg;
  if (cheapestFuelPrice != null) update.cheapestFuelPrice = cheapestFuelPrice;
  if (idleHours != null) update.idleHours = idleHours;
  if (fuelCardConnected != null) update.fuelCardConnected = fuelCardConnected;
  const profile = await TruckProfile.findOneAndUpdate(
    { userId: req.user._id },
    { $set: update },
    { upsert: true, new: true }
  );
  res.json(profile);
});

export default router;
