import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import Revenue from '../models/Revenue';

const router = Router();
router.use(protect);

router.get('/:period', async (req: AuthRequest, res: Response) => {
  const period = req.params.period as 'Week' | 'Month' | 'Quarter' | 'Year';
  if (!['Week', 'Month', 'Quarter', 'Year'].includes(period)) {
    res.status(400).json({ message: 'Invalid period' }); return;
  }
  const revenue = await Revenue.findOne({ userId: req.user._id, period });
  res.json(revenue ?? { period, grossRevenue: 0, netProfit: 0, totalMiles: 0, fuelCost: 0, expenses: [], trend: [] });
});

router.put('/:period', async (req: AuthRequest, res: Response) => {
  const period = req.params.period as 'Week' | 'Month' | 'Quarter' | 'Year';
  if (!['Week', 'Month', 'Quarter', 'Year'].includes(period)) {
    res.status(400).json({ message: 'Invalid period' }); return;
  }
  const { grossRevenue, netProfit, totalMiles, fuelCost, expenses, trend } = req.body;
  const update: Record<string, unknown> = {};
  if (grossRevenue != null) update.grossRevenue = grossRevenue;
  if (netProfit != null) update.netProfit = netProfit;
  if (totalMiles != null) update.totalMiles = totalMiles;
  if (fuelCost != null) update.fuelCost = fuelCost;
  if (expenses != null) update.expenses = expenses;
  if (trend != null) update.trend = trend;
  const revenue = await Revenue.findOneAndUpdate(
    { userId: req.user._id, period },
    { $set: update },
    { upsert: true, new: true }
  );
  res.json(revenue);
});

export default router;
