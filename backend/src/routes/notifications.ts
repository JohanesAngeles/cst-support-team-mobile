import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import PushToken from '../models/PushToken';
import Deadline from '../models/Deadline';
import MaintenanceRecord from '../models/MaintenanceRecord';

const router = Router();
router.use(protect);

// Register or refresh a push token
router.post('/token', async (req: AuthRequest, res: Response) => {
  const { token, platform } = req.body;
  if (!token || typeof token !== 'string') {
    res.status(400).json({ message: 'token is required' });
    return;
  }
  await PushToken.findOneAndUpdate(
    { token },
    { userId: req.user._id, token, platform: platform ?? 'ios' },
    { upsert: true, new: true }
  );
  res.json({ message: 'Token registered' });
});

// Remove a push token (on logout)
router.delete('/token', async (req: AuthRequest, res: Response) => {
  const { token } = req.body;
  if (token) await PushToken.deleteOne({ token, userId: req.user._id });
  res.json({ message: 'Token removed' });
});

// Get upcoming alerts for the current user (deadlines + maintenance due soon)
router.get('/alerts', async (req: AuthRequest, res: Response) => {
  const uid = req.user._id;
  const today = new Date();
  const in7Days = new Date(); in7Days.setDate(today.getDate() + 7);
  const todayStr = today.toISOString().split('T')[0];
  const in7Str = in7Days.toISOString().split('T')[0];

  const [deadlines, maintenance] = await Promise.all([
    Deadline.find({ userId: uid, date: { $gte: todayStr, $lte: in7Str } }).sort({ date: 1 }),
    MaintenanceRecord.find({ userId: uid, nextDate: { $gte: todayStr, $lte: in7Str } }).sort({ nextDate: 1 }),
  ]);

  const alerts = [
    ...deadlines.map(d => ({
      type: 'deadline',
      title: d.title,
      date: d.date,
      daysAway: Math.ceil((new Date(d.date).getTime() - today.getTime()) / 86400000),
    })),
    ...maintenance.map(m => ({
      type: 'maintenance',
      title: m.name,
      date: m.nextDate,
      daysAway: Math.ceil((new Date(m.nextDate).getTime() - today.getTime()) / 86400000),
    })),
  ].sort((a, b) => a.daysAway - b.daysAway);

  res.json(alerts);
});

// Internal: send a push notification to all tokens of a user
// Called by other routes when important events occur (not exposed to client directly in prod)
export async function sendPushToUser(userId: string, title: string, body: string) {
  const tokens = await PushToken.find({ userId });
  if (tokens.length === 0) return;

  const messages = tokens.map(t => ({
    to: t.token,
    sound: 'default' as const,
    title,
    body,
    data: {},
  }));

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    });
  } catch (err: any) {
    console.error('Push send error:', err.message);
  }
}

export default router;
