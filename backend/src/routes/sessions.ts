import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import LoginSession from '../models/LoginSession';

const router = Router();
router.use(protect);

// List this user's active (non-revoked) sessions, most recently active first
router.get('/', async (req: AuthRequest, res: Response) => {
  const sessions = await LoginSession.find({ userId: req.user._id, revoked: { $ne: true } })
    .sort({ lastSeenAt: -1 });

  res.json({
    sessions: sessions.map((s) => ({
      _id: s._id,
      device: s.device,
      ip: s.ip,
      createdAt: s.createdAt,
      lastSeenAt: s.lastSeenAt,
      current: s.sessionId === req.sessionId,
    })),
  });
});

// Log out every session except the one making this request
router.delete('/others', async (req: AuthRequest, res: Response) => {
  await LoginSession.updateMany(
    { userId: req.user._id, sessionId: { $ne: req.sessionId } },
    { revoked: true }
  );
  res.json({ message: 'Logged out of all other devices' });
});

// Revoke one specific session (not the current one — use logout for that)
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const session = await LoginSession.findOne({ _id: req.params.id, userId: req.user._id });
  if (!session) { res.status(404).json({ message: 'Session not found' }); return; }
  if (session.sessionId === req.sessionId) {
    res.status(400).json({ message: 'Cannot revoke your current session — log out instead' });
    return;
  }
  session.revoked = true;
  await session.save();
  res.json({ message: 'Session revoked' });
});

export default router;
