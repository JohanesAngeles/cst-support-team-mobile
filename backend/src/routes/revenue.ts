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

function prevPeriodBounds(period: string, stepsBack: number): { startStr: string; endStr: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const pad = (n: number) => String(n).padStart(2, '0');

  if (period === 'Week') {
    const end = new Date(now); end.setDate(end.getDate() - stepsBack * 7);
    const start = new Date(end); start.setDate(start.getDate() - 6);
    return { startStr: start.toISOString().split('T')[0], endStr: end.toISOString().split('T')[0] };
  }
  if (period === 'Month') {
    const raw = m - stepsBack;
    const ty = y + Math.floor(raw / 12);
    const tm = ((raw % 12) + 12) % 12;
    const start = new Date(ty, tm, 1);
    const end = new Date(ty, tm + 1, 0);
    return { startStr: `${ty}-${pad(tm + 1)}-01`, endStr: end.toISOString().split('T')[0] };
  }
  if (period === 'Quarter') {
    let tq = Math.floor(m / 3) - stepsBack;
    let ty = y;
    while (tq < 0) { tq += 4; ty--; }
    const qm = tq * 3;
    const end = new Date(ty, qm + 3, 0);
    return { startStr: `${ty}-${pad(qm + 1)}-01`, endStr: end.toISOString().split('T')[0] };
  }
  // Year
  return { startStr: `${y - stepsBack}-01-01`, endStr: `${y - stepsBack}-12-31` };
}

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
  const period = String(req.params.period);
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

  // Build 6-period trend: query the 5 prior periods then append current
  const priorTrend = await Promise.all(
    [5, 4, 3, 2, 1].map(async (i) => {
      const { startStr: s, endStr: e } = prevPeriodBounds(period, i);
      const t = await TripLog.find({ userId: uid, status: 'Completed', date: { $gte: s, $lte: e } });
      return Math.round(t.reduce((sum, tr) => sum + (tr.rate || 0), 0) * 100) / 100;
    })
  );
  const trend = [...priorTrend, Math.round(grossRevenue * 100) / 100];

  res.json({
    period,
    grossRevenue: Math.round(grossRevenue * 100) / 100,
    netProfit: Math.round(netProfit * 100) / 100,
    totalMiles: Math.round(totalMiles * 10) / 10,
    fuelCost: Math.round(fuelCost * 100) / 100,
    expenses: expenseItems,
    trend,
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
