import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import RoadReadyScore from '../models/RoadReadyScore';
import HOSEntry from '../models/HOSEntry';
import DVIREntry from '../models/DVIREntry';
import TripLog from '../models/TripLog';
import BrokerNote from '../models/BrokerNote';
import Deadline from '../models/Deadline';

const router = Router();
router.use(protect);

// GET my Road Ready profile
router.get('/', async (req: AuthRequest, res: Response) => {
  let profile = await RoadReadyScore.findOne({ userId: req.user._id });
  if (!profile) {
    profile = await RoadReadyScore.create({ userId: req.user._id });
  }
  res.json({ profile });
});

// PATCH — update education score after quiz
router.patch('/lesson', async (req: AuthRequest, res: Response) => {
  const { lessonId, scoreGained } = req.body;
  if (!lessonId) { res.status(400).json({ message: 'lessonId required' }); return; }

  let profile = await RoadReadyScore.findOne({ userId: req.user._id });
  if (!profile) profile = await RoadReadyScore.create({ userId: req.user._id });

  if (!profile.lessonsCompleted.includes(lessonId)) {
    profile.lessonsCompleted.push(lessonId);
    profile.educationScore = Math.min(50, profile.educationScore + (scoreGained ?? 10));
    profile.totalScore = profile.safetyScore + profile.skillScore + profile.complianceScore +
      profile.businessScore + profile.reputationScore + profile.educationScore;
    await profile.save();
  }
  res.json({ profile });
});

// PATCH — update skill challenge score
router.patch('/challenge', async (req: AuthRequest, res: Response) => {
  const { challengeId, score } = req.body;
  if (!challengeId || score == null) { res.status(400).json({ message: 'challengeId and score required' }); return; }

  let profile = await RoadReadyScore.findOne({ userId: req.user._id });
  if (!profile) profile = await RoadReadyScore.create({ userId: req.user._id });

  const prev = (profile.challengesBestScores as Record<string, number>)[challengeId] ?? 0;
  if (score > prev) {
    profile.challengesBestScores = { ...profile.challengesBestScores as object, [challengeId]: score };
    const gained = score - prev;
    profile.skillScore = Math.min(200, profile.skillScore + Math.floor(gained / 2));
    profile.totalScore = profile.safetyScore + profile.skillScore + profile.complianceScore +
      profile.businessScore + profile.reputationScore + profile.educationScore;
    profile.markModified('challengesBestScores');
    await profile.save();
  }
  res.json({ profile });
});

// PATCH — update freight career stats
router.patch('/freight', async (req: AuthRequest, res: Response) => {
  const { loadsCompleted, totalMiles, grossRevenue, netProfit, onTimeRate, avgRatePerMile } = req.body;

  let profile = await RoadReadyScore.findOne({ userId: req.user._id });
  if (!profile) profile = await RoadReadyScore.create({ userId: req.user._id });

  profile.freightCareerStats = {
    loadsCompleted: loadsCompleted ?? profile.freightCareerStats.loadsCompleted,
    totalMiles: totalMiles ?? profile.freightCareerStats.totalMiles,
    grossRevenue: grossRevenue ?? profile.freightCareerStats.grossRevenue,
    netProfit: netProfit ?? profile.freightCareerStats.netProfit,
    onTimeRate: onTimeRate ?? profile.freightCareerStats.onTimeRate,
    avgRatePerMile: avgRatePerMile ?? profile.freightCareerStats.avgRatePerMile,
  };

  // Business score based on profit and loads
  const loads = profile.freightCareerStats.loadsCompleted;
  const rpm = profile.freightCareerStats.avgRatePerMile;
  profile.businessScore = Math.min(150, Math.floor((loads * 5) + (rpm > 3 ? 30 : rpm > 2.5 ? 15 : 0)));

  // Reputation from on-time rate
  const otr = profile.freightCareerStats.onTimeRate;
  profile.reputationScore = Math.min(100, Math.floor(otr));

  profile.totalScore = profile.safetyScore + profile.skillScore + profile.complianceScore +
    profile.businessScore + profile.reputationScore + profile.educationScore;

  // Badges
  if (loads >= 10 && !profile.badges.includes('freight-veteran')) profile.badges.push('freight-veteran');
  if (rpm >= 3.5 && !profile.badges.includes('rate-master')) profile.badges.push('rate-master');

  await profile.save();
  res.json({ profile });
});

// PATCH — recompute safety score from real HOS + DVIR data
router.patch('/safety', async (req: AuthRequest, res: Response) => {
  const uid = req.user._id;

  const [hosEntries, dvirEntries] = await Promise.all([
    HOSEntry.find({ userId: uid }),
    DVIREntry.find({ userId: uid }),
  ]);

  // Clean HOS: driving ≤ 11h AND on-duty ≤ 14h per FMCSA property-carrier limits
  const cleanHOS = hosEntries.filter(h => h.drivingHours <= 11 && h.onDutyHours <= 14).length;

  // Points: up to 150 from clean HOS logs (5 pts each, max 30 days)
  const hosPoints = Math.min(150, cleanHOS * 5);

  // Points: up to 150 from DVIR inspections (10 pts each, max 15)
  const dvirPoints = Math.min(150, dvirEntries.length * 10);

  const safetyScore = hosPoints + dvirPoints;

  let profile = await RoadReadyScore.findOne({ userId: uid });
  if (!profile) profile = await RoadReadyScore.create({ userId: uid });

  profile.safetyScore = safetyScore;
  profile.totalScore = safetyScore + profile.skillScore + profile.complianceScore +
    profile.businessScore + profile.reputationScore + profile.educationScore;

  // Safety badges
  if (safetyScore >= 200 && !profile.badges.includes('safety-pro'))
    profile.badges.push('safety-pro');
  if (cleanHOS >= 30 && !profile.badges.includes('hos-champion'))
    profile.badges.push('hos-champion');

  await profile.save();
  res.json({ profile });
});

// PATCH — update O/O sim stats
router.patch('/oo', async (req: AuthRequest, res: Response) => {
  const { weekNumber, cashBalance, truckValue, totalProfitAllTime, breakdownsTotal, loansOutstanding } = req.body;

  let profile = await RoadReadyScore.findOne({ userId: req.user._id });
  if (!profile) profile = await RoadReadyScore.create({ userId: req.user._id });

  profile.ooStats = {
    weekNumber:         weekNumber ?? profile.ooStats.weekNumber,
    cashBalance:        cashBalance ?? profile.ooStats.cashBalance,
    truckValue:         truckValue ?? profile.ooStats.truckValue,
    totalProfitAllTime: totalProfitAllTime ?? profile.ooStats.totalProfitAllTime,
    breakdownsTotal:    breakdownsTotal ?? profile.ooStats.breakdownsTotal,
    loansOutstanding:   loansOutstanding ?? profile.ooStats.loansOutstanding,
  };

  // Compliance score from O/O (surviving breakdowns, avoiding debt)
  const weeks = profile.ooStats.weekNumber;
  const profit = profile.ooStats.totalProfitAllTime;
  profile.complianceScore = Math.min(200, Math.floor((weeks * 3) + (profit > 10000 ? 50 : profit > 0 ? 20 : 0)));

  profile.totalScore = profile.safetyScore + profile.skillScore + profile.complianceScore +
    profile.businessScore + profile.reputationScore + profile.educationScore;

  if (weeks >= 10 && !profile.badges.includes('oo-survivor')) profile.badges.push('oo-survivor');
  if (profit >= 50000 && !profile.badges.includes('oo-profitable')) profile.badges.push('oo-profitable');

  await profile.save();
  res.json({ profile });
});

// PATCH — sync compliance, business, and reputation from real activity data
router.patch('/sync', async (req: AuthRequest, res: Response) => {
  const uid = req.user._id;

  const [hosEntries, dvirEntries, trips, brokerNotes, deadlines] = await Promise.all([
    HOSEntry.find({ userId: uid }).sort({ date: -1 }).limit(60),
    DVIREntry.find({ userId: uid }).sort({ createdAt: -1 }).limit(90),
    TripLog.find({ userId: uid }).lean(),
    BrokerNote.find({ userId: uid }).lean(),
    Deadline.find({ userId: uid }).lean(),
  ]);

  let profile = await RoadReadyScore.findOne({ userId: uid });
  if (!profile) profile = await RoadReadyScore.create({ userId: uid });

  // ── Compliance Score (0–200) ───────────────────────────────────────────────
  // 100 pts from clean HOS (≤11h drive, ≤14h on-duty)
  const recentHOS = hosEntries.slice(0, 30);
  const cleanHOS = recentHOS.filter((h: any) => h.drivingHours <= 11 && h.onDutyHours <= 14).length;
  const hosCompliancePts = recentHOS.length > 0
    ? Math.round((cleanHOS / recentHOS.length) * 100)
    : 0;

  // 60 pts from DVIR inspection frequency
  const dvirPts = Math.min(60, dvirEntries.length * 4);

  // 40 pts: no overdue deadlines (each overdue deadline costs 10 pts)
  const now = new Date();
  const overdue = deadlines.filter(d => new Date(d.dueDate) < now).length;
  const deadlinePts = Math.max(0, 40 - overdue * 10);

  profile.complianceScore = Math.min(200, hosCompliancePts + dvirPts + deadlinePts);

  // ── Business Score (0–150) ────────────────────────────────────────────────
  // From real TripLog data: loads completed + revenue per mile + net profit
  const tripCount = trips.length;
  const totalMiles = trips.reduce((s, t) => s + (t.miles ?? t.distance ?? 0), 0);
  const totalRevenue = trips.reduce((s, t) => s + (t.totalPay ?? t.revenue ?? 0), 0);
  const rpm = totalMiles > 0 ? totalRevenue / totalMiles : 0;

  const tripPts   = Math.min(60, tripCount * 3);        // 3 pts per trip, max 60
  const rpmPts    = rpm >= 3.5 ? 50 : rpm >= 2.5 ? 30 : rpm >= 2 ? 15 : 0;
  const volumePts = Math.min(40, Math.floor(totalRevenue / 5000)); // 1 pt per $5k gross

  profile.businessScore = Math.min(150, tripPts + rpmPts + volumePts);

  // ── Reputation Score (0–100) ──────────────────────────────────────────────
  // From broker notes and trip completion volume
  const noteCount   = brokerNotes.length;
  const notePts     = Math.min(50, noteCount * 5);       // 5 pts per broker reviewed
  const tripRepPts  = Math.min(50, Math.floor(tripCount * 1.5)); // 1.5 pts per completed trip

  profile.reputationScore = Math.min(100, notePts + tripRepPts);

  // ── Recalculate total ─────────────────────────────────────────────────────
  profile.totalScore =
    profile.safetyScore +
    profile.skillScore +
    profile.complianceScore +
    profile.businessScore +
    profile.reputationScore +
    profile.educationScore;

  // ── Badges from real activity ─────────────────────────────────────────────
  if (tripCount >= 10 && !profile.badges.includes('freight-veteran'))
    profile.badges.push('freight-veteran');
  if (rpm >= 3.5 && !profile.badges.includes('rate-master'))
    profile.badges.push('rate-master');
  if (cleanHOS >= 30 && !profile.badges.includes('hos-champion'))
    profile.badges.push('hos-champion');

  await profile.save();
  res.json({ profile });
});

export default router;
