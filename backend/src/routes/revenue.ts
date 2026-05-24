import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import Revenue from '../models/Revenue';
import TripLog from '../models/TripLog';
import Expense from '../models/Expense';
import FuelStop from '../models/FuelStop';

const router = Router();
router.use(protect);

const CATEGORY_COLORS: Record<string, string> = {
  Fuel: '#3498DB', Repairs: '#E67E22', Insurance: '#27AE60',
  Permits: '#9B59B6', Food: '#F39C12', Tolls: '#E74C3C', Other: '#95A5A6',
};

function periodBounds(period: string): { startStr: string; endStr: string; startDt: Date; endDt: Date } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const todayStr = now.toISOString().split('T')[0];
  const endDt = new Date(now); endDt.setHours(23, 59, 59, 999);

  if (period === 'Week') {
    const s = new Date(now); s.setDate(s.getDate() - 6); s.setHours(0, 0, 0, 0);
    return { startStr: s.toISOString().split('T')[0], endStr: todayStr, startDt: s, endDt };
  }
  if (period === 'Month') {
    const s = new Date(y, m, 1);
    return { startStr: `${y}-${String(m + 1).padStart(2, '0')}-01`, endStr: todayStr, startDt: s, endDt };
  }
  if (period === 'Quarter') {
    const q = Math.floor(m / 3);
    const qm = q * 3;
    const s = new Date(y, qm, 1);
    return { startStr: `${y}-${String(qm + 1).padStart(2, '0')}-01`, endStr: todayStr, startDt: s, endDt };
  }
  // Year
  const s = new Date(y, 0, 1);
  return { startStr: `${y}-01-01`, endStr: todayStr, startDt: s, endDt };
}

router.get('/live/:period', async (req: AuthRequest, res: Response) => {
  const period = req.params.period;
  if (!['Week', 'Month', 'Quarter', 'Year'].includes(period)) {
    res.status(400).json({ message: 'Invalid period' }); return;
  }

  const { startStr, endStr, startDt, endDt } = periodBounds(period);
  const uid = req.user._id;

  const [trips, expenses, fuelStops] = await Promise.all([
    TripLog.find({ userId: uid, date: { $gte: startStr, $lte: endStr } }),
    Expense.find({ userId: uid, createdAt: { $gte: startDt, $lte: endDt } }),
    FuelStop.find({ userId: uid, date: { $gte: startStr, $lte: endStr } }),
  ]);

  const grossRevenue = trips.filter(t => t.status === 'Completed').reduce((s, t) => s + (t.rate || 0), 0);
  const totalMiles = trips.reduce((s, t) => s + (t.miles || 0), 0);

  // Group expenses by category
  const expMap: Record<string, number> = {};
  for (const e of expenses) {
    expMap[e.category] = (expMap[e.category] || 0) + e.amount;
  }

  // Use FuelLog as Fuel cost if no Fuel category in Expenses
  const fuelLogTotal = fuelStops.reduce((s, f) => s + (f.gallons * f.pricePerGallon), 0);
  if (fuelLogTotal > 0 && !expMap['Fuel']) {
    expMap['Fuel'] = fuelLogTotal;
  }

  const expenseItems = Object.entries(expMap).map(([label, amount]) => ({
    label, amount: Math.round(amount * 100) / 100, color: CATEGORY_COLORS[label] ?? '#95A5A6',
  }));

  const totalExpenses = expenseItems.reduce((s, e) => s + e.amount, 0);
  const fuelCost = expMap['Fuel'] ?? 0;
  const netProfit = grossRevenue - totalExpenses;

  res.json({
    period,
    grossRevenue: Math.round(grossRevenue * 100) / 100,
    netProfit: Math.round(netProfit * 100) / 100,
    totalMiles: Math.round(totalMiles * 10) / 10,
    fuelCost: Math.round(fuelCost * 100) / 100,
    expenses: expenseItems,
    trend: [],
    isLive: true,
  });
});

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
