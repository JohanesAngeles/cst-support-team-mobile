import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import Block from '../models/Block';
import Follow from '../models/Follow';
import FriendRequest from '../models/FriendRequest';
import User from '../models/User';

const router = Router();
router.use(protect);

// GET /api/blocks — my blocked + muted users
router.get('/', async (req: AuthRequest, res: Response) => {
  const relations = await Block.find({ actorId: req.user._id }).sort({ createdAt: -1 });
  const users = await User.find({ _id: { $in: relations.map(r => r.targetId) } });
  const byId = new Map(users.map(u => [u._id.toString(), u]));

  const toEntry = (r: (typeof relations)[number]) => {
    const u = byId.get(r.targetId.toString());
    return u ? { _id: u._id, name: u.name, avatarUrl: u.avatarUrl ?? null, createdAt: r.createdAt } : null;
  };

  res.json({
    blocked: relations.filter(r => r.type === 'block').map(toEntry).filter(Boolean),
    muted: relations.filter(r => r.type === 'mute').map(toEntry).filter(Boolean),
  });
});

// POST /api/blocks/:id/block — toggle block on a user
router.post('/:id/block', async (req: AuthRequest, res: Response) => {
  const targetId = req.params.id;
  if (targetId === req.user._id.toString()) { res.status(400).json({ message: "You can't block yourself" }); return; }
  const target = await User.findById(targetId);
  if (!target) { res.status(404).json({ message: 'User not found' }); return; }

  const existing = await Block.findOne({ actorId: req.user._id, targetId, type: 'block' });
  if (existing) {
    await existing.deleteOne();
    res.json({ isBlocked: false });
    return;
  }

  await Block.findOneAndUpdate(
    { actorId: req.user._id, targetId },
    { type: 'block' },
    { upsert: true, new: true }
  );
  // Blocking severs any follow relationship in either direction
  await Follow.deleteMany({
    $or: [
      { followerId: req.user._id, followingId: targetId },
      { followerId: targetId, followingId: req.user._id },
    ],
  });
  // ...and any friendship or pending friend request between them
  await FriendRequest.deleteMany({
    $or: [
      { senderId: req.user._id, recipientId: targetId },
      { senderId: targetId, recipientId: req.user._id },
    ],
  });
  res.json({ isBlocked: true });
});

// POST /api/blocks/:id/mute — toggle mute on a user (their posts stop showing in my feed only)
router.post('/:id/mute', async (req: AuthRequest, res: Response) => {
  const targetId = req.params.id;
  if (targetId === req.user._id.toString()) { res.status(400).json({ message: "You can't mute yourself" }); return; }
  const target = await User.findById(targetId);
  if (!target) { res.status(404).json({ message: 'User not found' }); return; }

  const existing = await Block.findOne({ actorId: req.user._id, targetId, type: 'mute' });
  if (existing) {
    await existing.deleteOne();
    res.json({ isMuted: false });
    return;
  }

  await Block.findOneAndUpdate(
    { actorId: req.user._id, targetId },
    { type: 'mute' },
    { upsert: true, new: true }
  );
  res.json({ isMuted: true });
});

export default router;
