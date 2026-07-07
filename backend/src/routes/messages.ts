import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { protect, AuthRequest } from '../middleware/auth';
import DirectMessage from '../models/DirectMessage';
import User from '../models/User';
import NetworkPost from '../models/NetworkPost';

const router = Router();
router.use(protect);

// List conversations: one row per partner, with last message + unread count
router.get('/conversations', async (req: AuthRequest, res: Response) => {
  const meId = req.user._id;

  const threads = await DirectMessage.aggregate([
    { $match: { $or: [{ senderId: meId }, { recipientId: meId }] } },
    { $sort: { createdAt: -1 } },
    { $addFields: { partnerId: { $cond: [{ $eq: ['$senderId', meId] }, '$recipientId', '$senderId'] } } },
    {
      $group: {
        _id: '$partnerId',
        lastMessage: {
          $first: {
            $cond: [{ $ne: ['$message', ''] }, '$message', { $cond: ['$sharedPost', '📤 Shared a post', '$message'] }],
          },
        },
        lastMessageAt: { $first: '$createdAt' },
      },
    },
    { $sort: { lastMessageAt: -1 } },
  ]);

  const unread = await DirectMessage.aggregate([
    { $match: { recipientId: meId, readAt: { $exists: false } } },
    { $group: { _id: '$senderId', count: { $sum: 1 } } },
  ]);
  const unreadMap = new Map(unread.map(u => [u._id.toString(), u.count]));

  const partnerIds = threads.map(t => t._id);
  const partners = await User.find({ _id: { $in: partnerIds } });
  const partnerMap = new Map(partners.map(p => [p._id.toString(), p]));

  const conversations = threads
    .map(t => {
      const partner = partnerMap.get(t._id.toString());
      if (!partner) return null;
      return {
        userId: partner._id,
        name: partner.name,
        avatarUrl: partner.avatarUrl ?? null,
        lastMessage: t.lastMessage,
        lastMessageAt: t.lastMessageAt,
        unreadCount: unreadMap.get(t._id.toString()) ?? 0,
      };
    })
    .filter(Boolean);

  res.json({ conversations });
});

// Message history with one user
router.get('/:userId', async (req: AuthRequest, res: Response) => {
  const otherId = req.params.userId as string;
  if (!mongoose.isValidObjectId(otherId)) { res.status(400).json({ message: 'Invalid user id' }); return; }

  const messages = await DirectMessage.find({
    $or: [
      { senderId: req.user._id, recipientId: otherId },
      { senderId: otherId, recipientId: req.user._id },
    ],
  }).sort({ createdAt: 1 }).limit(200);

  res.json({ messages });
});

// Send a message to one user — optionally forwarding a shared post (with an optional caption)
router.post('/:userId', async (req: AuthRequest, res: Response) => {
  const otherId = req.params.userId as string;
  if (!mongoose.isValidObjectId(otherId)) { res.status(400).json({ message: 'Invalid user id' }); return; }
  if (otherId === req.user._id.toString()) { res.status(400).json({ message: "You can't message yourself" }); return; }

  const { message, sharedPostId } = req.body;
  if (!message?.trim() && !sharedPostId) { res.status(400).json({ message: 'Message is required' }); return; }

  const recipient = await User.findById(otherId);
  if (!recipient) { res.status(404).json({ message: 'User not found' }); return; }

  let sharedPost;
  if (sharedPostId) {
    const original = await NetworkPost.findById(sharedPostId);
    if (!original) { res.status(404).json({ message: 'Post to share was not found' }); return; }
    sharedPost = {
      postId: original._id,
      authorName: original.authorName,
      authorAvatarUrl: original.authorAvatarUrl,
      title: original.title,
      body: original.body,
      imageUrl: original.imageUrl,
      createdAt: original.createdAt,
    };
  }

  const msg = await DirectMessage.create({
    senderId: req.user._id,
    recipientId: otherId,
    message: message?.trim() ?? '',
    sharedPost,
  });
  res.status(201).json({ message: msg });
});

// Mark messages from one user as read
router.put('/:userId/read', async (req: AuthRequest, res: Response) => {
  const otherId = req.params.userId as string;
  if (!mongoose.isValidObjectId(otherId)) { res.status(400).json({ message: 'Invalid user id' }); return; }
  await DirectMessage.updateMany(
    { senderId: otherId, recipientId: req.user._id, readAt: { $exists: false } },
    { readAt: new Date() }
  );
  res.json({ message: 'Marked as read' });
});

export default router;
