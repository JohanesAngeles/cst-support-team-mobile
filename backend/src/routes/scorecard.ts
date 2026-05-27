import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import TripLog from '../models/TripLog';
import Expense from '../models/Expense';
import FuelStop from '../models/FuelStop';
import HOSEntry from '../models/HOSEntry';

const router = Router();
router.use(protect);

function getWeekBounds(offset = 0): { startStr: string; endStr: string; startDt: Date; endDt: Date } {
  const now = new Date();
  const dow = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dow + 6) % 7) - offset * 7);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const fmt = (d: Date) => d.toISOString().split('T')[0];
  return { startStr: fmt(monday), endStr: fmt(sunday), startDt: monday, endDt: sunday };
}

router.get('/', async (req: AuthRequest, res: Response) => {
  const offset = parseInt(String(req.query.week ?? '0'));
  const { startStr, endStr, startDt, endDt } = getWeekBounds(isNaN(offset) ? 0 : offset);
  const uid = req.user._id;

  const [trips, expenses, fuelStops, hosEntries] = await Promise.all([
    TripLog.find({ userId: uid, date: { $gte: startStr, $lte: endStr } }),
    Expense.find({ userId: uid, createdAt: { $gte: startDt, $lte: endDt } }),
    FuelStop.find({ userId: uid, date: { $gte: startStr, $lte: endStr } }),
    HOSEntry.find({ userId: uid, date: { $gte: startStr, $lte: endStr } }),
  ]);

  const completedTrips = trips.filter(t => t.status === 'Completed');
  const grossRevenue = completedTrips.reduce((s, t) => s + (t.rate || 0), 0);
  const totalMiles = trips.reduce((s, t) => s + (t.miles || 0), 0);

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const fuelCost = fuelStops.reduce((s, f) => s + f.gallons * f.pricePerGallon, 0);
  const fuelGallons = fuelStops.reduce((s, f) => s + f.gallons, 0);
  const fuelEfficiency = fuelGallons > 0 ? totalMiles / fuelGallons : 0;
  const avgRatePerMile = totalMiles > 0 ? grossRevenue / totalMiles : 0;

  const drivingHours = hosEntries.reduce((s, h) => s + h.drivingHours, 0);
  const onDutyHours = hosEntries.reduce((s, h) => s + h.onDutyHours, 0);

  const netRevenue = grossRevenue - totalExpenses - fuelCost;

  res.json({
    weekStart: startStr,
    weekEnd: endStr,
    grossRevenue: Math.round(grossRevenue * 100) / 100,
    netRevenue: Math.round(netRevenue * 100) / 100,
    totalMiles: Math.round(totalMiles * 10) / 10,
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    fuelCost: Math.round(fuelCost * 100) / 100,
    fuelGallons: Math.round(fuelGallons * 100) / 100,
    fuelEfficiency: Math.round(fuelEfficiency * 100) / 100,
    avgRatePerMile: Math.round(avgRatePerMile * 100) / 100,
    drivingHours: Math.round(drivingHours * 100) / 100,
    onDutyHours: Math.round(onDutyHours * 100) / 100,
    completedTrips: completedTrips.length,
    totalTrips: trips.length,
  });
});

export default router;
