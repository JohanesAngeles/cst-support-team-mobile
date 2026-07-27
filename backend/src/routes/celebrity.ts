import { Router, Response } from 'express';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import Celebrity from '../models/Celebrity';
import PromoRedemption from '../models/PromoRedemption';
import User from '../models/User';
import { celebrityAuth, CelebrityAuthRequest } from '../middleware/celebrityAuth';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many login attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const signCelebrityToken = (id: string) =>
  jwt.sign({ id, type: 'celebrity' }, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN ?? '30d',
  } as jwt.SignOptions);

// ── POST /api/celebrity/login ────────────────────────────────────────────────
router.post('/login', loginLimiter, async (req, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ message: 'Email and password are required.' }); return;
  }

  const celebrity = await Celebrity.findOne({ email: String(email).toLowerCase().trim() });
  if (!celebrity || !(await celebrity.comparePassword(password))) {
    res.status(401).json({ message: 'Invalid email or password.' }); return;
  }

  const token = signCelebrityToken(String(celebrity._id));
  res.json({
    token,
    celebrity: { id: celebrity._id, name: celebrity.name, email: celebrity.email, code: celebrity.code },
  });
});

// ── GET /api/celebrity/me ────────────────────────────────────────────────────
router.get('/me', celebrityAuth, async (req: CelebrityAuthRequest, res: Response) => {
  const c = req.celebrity!;
  res.json({
    id: c._id,
    name: c.name,
    email: c.email,
    code: c.code,
    discountType: c.discountType,
    discountValue: c.discountValue,
    plans: c.plans,
    active: c.active,
    expiresAt: c.expiresAt,
    maxRedemptions: c.maxRedemptions,
    redemptionCount: c.redemptionCount,
  });
});

// ── GET /api/celebrity/me/stats ───────────────────────────────────────────────
// Aggregate-only performance stats — deliberately never returns individual
// subscribers' names/emails, to keep real customers' PII away from a third party.
router.get('/me/stats', celebrityAuth, async (req: CelebrityAuthRequest, res: Response) => {
  const celebrityId = req.celebrity!._id;

  const redemptions = await PromoRedemption.find({ celebrityId }).select('userId plan source amountCharged createdAt');
  const totalRedemptions = redemptions.length;
  const totalRevenueCents = redemptions.reduce((sum, r) => sum + r.amountCharged, 0);

  const userIds = [...new Set(redemptions.map(r => String(r.userId)))];
  const users = await User.find({ _id: { $in: userIds } }).select('subscriptionStatus');
  const activeSubscribers = users.filter(u => (u as any).subscriptionStatus === 'active').length;
  const cancelledSubscribers = users.filter(u =>
    (u as any).subscriptionStatus === 'cancelled' || (u as any).subscriptionStatus === 'past_due'
  ).length;

  // Weekly redemption-count trend for the last ~12 weeks.
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const trendMap = new Map<string, number>();
  for (const r of redemptions) {
    const weekStart = new Date(Math.floor(r.createdAt.getTime() / weekMs) * weekMs).toISOString().slice(0, 10);
    trendMap.set(weekStart, (trendMap.get(weekStart) ?? 0) + 1);
  }
  const trend = [...trendMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([weekStart, count]) => ({ weekStart, count }));

  res.json({
    totalRedemptions,
    activeSubscribers,
    cancelledSubscribers,
    totalRevenueCents,
    trend,
  });
});

// ── PATCH /api/celebrity/me/password ─────────────────────────────────────────
router.patch('/me/password', celebrityAuth, async (req: CelebrityAuthRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    res.status(400).json({ message: 'currentPassword and newPassword are required.' }); return;
  }
  if (String(newPassword).length < 8) {
    res.status(400).json({ message: 'New password must be at least 8 characters.' }); return;
  }

  const celebrity = req.celebrity!;
  if (!(await celebrity.comparePassword(currentPassword))) {
    res.status(401).json({ message: 'Current password is incorrect.' }); return;
  }

  celebrity.password = newPassword;
  await celebrity.save();
  res.json({ message: 'Password updated.' });
});

export default router;
