import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import FriendRequest from '../models/FriendRequest';
import User from '../models/User';
import Block from '../models/Block';
import { createNotification } from '../utils/notify';
import { getFriendStatus } from '../utils/friendStatus';

const router = Router();
router.use(protect);

router.get('/requests', async (req: AuthRequest, res: Response) => {
  const requests = await FriendRequest.find({ recipientId: req.user._id, status: 'pending' }).sort({ createdAt: -1 });
  const senders = await User.find({ _id: { $in: requests.map(r => r.senderId) } });
  const senderById = new Map(senders.map(u => [u._id.toString(), u]));
  res.json({
    requests: requests.map(r => {
      const u = senderById.get(r.senderId.toString());
      return {
        _id: r._id,
        senderId: r.senderId,
        senderName: u?.name ?? 'Unknown',
        senderAvatarUrl: u?.avatarUrl ?? null,
        senderTruckType: u?.truckType ?? null,
        createdAt: r.createdAt,
      };
    }),
  });
});

router.get('/', async (req: AuthRequest, res: Response) => {
  const userId = (req.query.userId as string) || req.user._id.toString();
  const accepted = await FriendRequest.find({
    status: 'accepted',
    $or: [{ senderId: userId }, { recipientId: userId }],
  }).sort({ respondedAt: -1 }).limit(200);

  const friendIds = accepted.map(r => (r.senderId.toString() === userId ? r.recipientId : r.senderId));
  const users = await User.find({ _id: { $in: friendIds } });
  res.json({ users: users.map(u => ({ _id: u._id, name: u.name, avatarUrl: u.avatarUrl ?? null, truckType: u.truckType ?? null })) });
});

router.post('/:id/request', async (req: AuthRequest, res: Response) => {
  const targetId = req.params.id as string;
  const meId = req.user._id.toString();
  if (targetId === meId) { res.status(400).json({ message: "You can't friend yourself" }); return; }

  const target = await User.findById(targetId);
  if (!target) { res.status(404).json({ message: 'User not found' }); return; }

  const blocked = await Block.exists({
    type: 'block',
    $or: [{ actorId: meId, targetId }, { actorId: targetId, targetId: meId }],
  });
  if (blocked) { res.status(403).json({ message: 'Unavailable' }); return; }

  const existing = await FriendRequest.findOne({
    $or: [{ senderId: meId, recipientId: targetId }, { senderId: targetId, recipientId: meId }],
  });

  if (existing?.status === 'accepted') { res.json({ friendStatus: 'friends' }); return; }

  if (existing?.status === 'pending') {
    if (existing.senderId.toString() === targetId) {
      // They already sent us a request — sending one back means both sides agreed, so accept immediately.
      existing.status = 'accepted';
      existing.respondedAt = new Date();
      await existing.save();
      createNotification({
        recipientId: targetId,
        actorId: meId,
        actorName: req.user.name,
        actorAvatarUrl: req.user.avatarUrl,
        type: 'friend_accept',
      }).catch(() => {});
      res.json({ friendStatus: 'friends' });
    } else {
      res.json({ friendStatus: 'pending_sent' });
    }
    return;
  }

  await FriendRequest.create({ senderId: meId, recipientId: targetId, status: 'pending' });
  createNotification({
    recipientId: targetId,
    actorId: meId,
    actorName: req.user.name,
    actorAvatarUrl: req.user.avatarUrl,
    type: 'friend_request',
  }).catch(() => {});
  res.status(201).json({ friendStatus: 'pending_sent' });
});

router.post('/:id/accept', async (req: AuthRequest, res: Response) => {
  const senderId = req.params.id as string;
  const meId = req.user._id.toString();
  const existing = await FriendRequest.findOne({ senderId, recipientId: meId, status: 'pending' });
  if (!existing) { res.status(404).json({ message: 'No pending request found' }); return; }

  existing.status = 'accepted';
  existing.respondedAt = new Date();
  await existing.save();

  createNotification({
    recipientId: senderId,
    actorId: meId,
    actorName: req.user.name,
    actorAvatarUrl: req.user.avatarUrl,
    type: 'friend_accept',
  }).catch(() => {});

  res.json({ friendStatus: 'friends' });
});

router.post('/:id/decline', async (req: AuthRequest, res: Response) => {
  const senderId = req.params.id as string;
  const meId = req.user._id.toString();
  await FriendRequest.findOneAndDelete({ senderId, recipientId: meId, status: 'pending' });
  res.json({ friendStatus: 'none' });
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const otherId = req.params.id as string;
  const meId = req.user._id.toString();
  const existing = await FriendRequest.findOne({
    $or: [{ senderId: meId, recipientId: otherId }, { senderId: otherId, recipientId: meId }],
  });
  if (existing) await existing.deleteOne();
  res.json({ friendStatus: 'none' });
});

router.get('/:id/status', async (req: AuthRequest, res: Response) => {
  const friendStatus = await getFriendStatus(req.user._id.toString(), req.params.id as string);
  res.json({ friendStatus });
});

export default router;
