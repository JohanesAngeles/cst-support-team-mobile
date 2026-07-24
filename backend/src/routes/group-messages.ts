import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { protect, AuthRequest } from '../middleware/auth';
import GroupConversation, { IGroupConversation } from '../models/GroupConversation';
import GroupMessage from '../models/GroupMessage';
import User from '../models/User';
import NetworkPost, { REACTION_TYPES, ReactionType } from '../models/NetworkPost';
import Block from '../models/Block';
import { createNotification } from '../utils/notify';
import { sendPushToUser } from './notifications';
import { io } from '../app';

const MAX_PARTICIPANTS = 20;

const router = Router();
router.use(protect);

async function isParticipant(conversationId: string, userId: string) {
  return GroupConversation.exists({ _id: conversationId, participantIds: userId });
}

// Shared response shape for every endpoint that returns a single conversation, so the
// client always sees populated { participants } rather than raw participantIds sometimes.
async function toConversationDTO(conversation: IGroupConversation) {
  const users = await User.find({ _id: { $in: conversation.participantIds } }).select('name avatarUrl');
  return {
    _id: conversation._id,
    name: conversation.name ?? null,
    creatorId: conversation.creatorId,
    participants: users.map(u => ({ _id: u._id, name: u.name, avatarUrl: u.avatarUrl ?? null })),
  };
}

// Create a group conversation. Body: { participantIds: string[], name?: string }
router.post('/', async (req: AuthRequest, res: Response) => {
  const { participantIds, name } = req.body as { participantIds?: string[]; name?: string };
  const meId = req.user._id.toString();

  const ids = [...new Set([...(participantIds ?? []), meId])].filter(id => mongoose.isValidObjectId(id));
  if (ids.length < 3) { res.status(400).json({ message: 'Pick at least 2 other drivers for a group chat' }); return; }
  if (ids.length > MAX_PARTICIPANTS) { res.status(400).json({ message: `Group chats are limited to ${MAX_PARTICIPANTS} members` }); return; }

  const others = ids.filter(id => id !== meId);
  const [users, blocked] = await Promise.all([
    User.find({ _id: { $in: others } }),
    Block.find({ type: 'block', $or: [{ actorId: meId, targetId: { $in: others } }, { actorId: { $in: others }, targetId: meId }] }),
  ]);
  if (users.length !== others.length) { res.status(404).json({ message: 'One or more drivers could not be found' }); return; }
  if (blocked.length > 0) { res.status(403).json({ message: 'You cannot start a group with someone you have blocked or who has blocked you' }); return; }

  const conversation = await GroupConversation.create({
    name: name?.trim() || undefined,
    participantIds: ids,
    creatorId: req.user._id,
  });
  res.status(201).json({ conversation: await toConversationDTO(conversation) });
});

// List my group conversations: name/participants, last message, unread count.
router.get('/', async (req: AuthRequest, res: Response) => {
  const meId = req.user._id;
  const conversations = await GroupConversation.find({ participantIds: meId }).sort({ createdAt: -1 });
  if (conversations.length === 0) { res.json({ conversations: [] }); return; }

  const convIds = conversations.map(c => c._id);
  const participantIds = [...new Set(conversations.flatMap(c => c.participantIds.map(id => id.toString())))];

  const [lastMessages, unread, users] = await Promise.all([
    GroupMessage.aggregate([
      { $match: { conversationId: { $in: convIds } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$conversationId',
          lastMessage: {
            $first: {
              $cond: [{ $ne: ['$message', ''] }, '$message', { $cond: ['$sharedPost', '📤 Shared a post', '$message'] }],
            },
          },
          lastMessageAt: { $first: '$createdAt' },
        },
      },
    ]),
    GroupMessage.aggregate([
      { $match: { conversationId: { $in: convIds }, senderId: { $ne: meId }, 'readBy.userId': { $ne: meId } } },
      { $group: { _id: '$conversationId', count: { $sum: 1 } } },
    ]),
    User.find({ _id: { $in: participantIds } }).select('name avatarUrl'),
  ]);

  const lastMessageMap = new Map(lastMessages.map(m => [m._id.toString(), m]));
  const unreadMap = new Map(unread.map(u => [u._id.toString(), u.count]));
  const userMap = new Map(users.map(u => [u._id.toString(), u]));

  const result = conversations
    .map(c => {
      const last = lastMessageMap.get(c._id.toString());
      const participants = c.participantIds
        .map(id => userMap.get(id.toString()))
        .filter(Boolean)
        .map(u => ({ _id: u!._id, name: u!.name, avatarUrl: u!.avatarUrl ?? null }));
      return {
        _id: c._id,
        name: c.name ?? null,
        participants,
        creatorId: c.creatorId,
        lastMessage: last?.lastMessage ?? null,
        lastMessageAt: last?.lastMessageAt ?? c.createdAt,
        unreadCount: unreadMap.get(c._id.toString()) ?? 0,
      };
    })
    .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

  res.json({ conversations: result });
});

// Message history for one group, plus the conversation's participant list so the client
// doesn't need a second round-trip to render the header.
router.get('/:id', async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const conversation = await GroupConversation.findOne({ _id: id, participantIds: req.user._id });
  if (!conversation) { res.status(404).json({ message: 'Not found' }); return; }

  const [messages, conversationDTO] = await Promise.all([
    GroupMessage.find({ conversationId: id }).sort({ createdAt: 1 }).limit(200),
    toConversationDTO(conversation),
  ]);

  res.json({ messages, conversation: conversationDTO });
});

// Send a message to the group — optionally forwarding a shared post.
router.post('/:id', async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const conversation = await GroupConversation.findOne({ _id: id, participantIds: req.user._id });
  if (!conversation) { res.status(404).json({ message: 'Not found' }); return; }

  const { message, sharedPostId } = req.body;
  if (!message?.trim() && !sharedPostId) { res.status(400).json({ message: 'Message is required' }); return; }

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

  const msg = await GroupMessage.create({
    conversationId: id,
    senderId: req.user._id,
    senderName: req.user.name,
    senderAvatarUrl: req.user.avatarUrl,
    message: message?.trim() ?? '',
    sharedPost,
    readBy: [{ userId: req.user._id, readAt: new Date() }],
  });

  io.to(`group:${id}`).emit('group_message', msg);

  const groupTitle = conversation.name || `${req.user.name}'s group`;
  for (const participantId of conversation.participantIds) {
    if (participantId.toString() === req.user._id.toString()) continue;
    sendPushToUser(
      participantId.toString(),
      groupTitle,
      `${req.user.name}: ${msg.message || '📤 Shared a post'}`,
      'directMessages',
      { type: 'group', conversationId: id }
    ).catch(() => {});
  }

  res.status(201).json({ message: msg });
});

// Toggle a reaction (tapback) on a group message — same type again removes it, a different
// type replaces it. Live-pushed to the group's socket room.
router.post('/:id/:messageId/react', async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const { messageId } = req.params;
  const { type } = req.body as { type: ReactionType };
  if (!REACTION_TYPES.includes(type)) { res.status(400).json({ message: 'Invalid reaction type' }); return; }
  if (!(await isParticipant(id, req.user._id.toString()))) { res.status(404).json({ message: 'Not found' }); return; }

  const msg = await GroupMessage.findOne({ _id: messageId, conversationId: id });
  if (!msg) { res.status(404).json({ message: 'Not found' }); return; }

  const meId = req.user._id.toString();
  const existingIndex = msg.reactions.findIndex(r => r.userId.toString() === meId);
  if (existingIndex >= 0 && msg.reactions[existingIndex].type === type) {
    msg.reactions.splice(existingIndex, 1);
  } else if (existingIndex >= 0) {
    msg.reactions[existingIndex].type = type;
  } else {
    msg.reactions.push({ userId: req.user._id, type } as any);
  }
  await msg.save();

  io.to(`group:${id}`).emit('group_message_updated', msg);
  res.json({ message: msg });
});

// Mark every unread message in the group as read by me.
router.put('/:id/read', async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  if (!(await isParticipant(id, req.user._id.toString()))) { res.status(404).json({ message: 'Not found' }); return; }
  await GroupMessage.updateMany(
    { conversationId: id, senderId: { $ne: req.user._id }, 'readBy.userId': { $ne: req.user._id } },
    { $push: { readBy: { userId: req.user._id, readAt: new Date() } } }
  );
  res.json({ message: 'Marked as read' });
});

// Add a member — any current participant can invite, up to the group size cap.
router.post('/:id/participants', async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const { userId } = req.body as { userId?: string };
  if (!userId || !mongoose.isValidObjectId(userId)) { res.status(400).json({ message: 'userId is required' }); return; }

  const conversation = await GroupConversation.findOne({ _id: id, participantIds: req.user._id });
  if (!conversation) { res.status(404).json({ message: 'Not found' }); return; }
  if (conversation.participantIds.some(p => p.toString() === userId)) { res.status(400).json({ message: 'Already in this group' }); return; }
  if (conversation.participantIds.length >= MAX_PARTICIPANTS) { res.status(400).json({ message: `Group chats are limited to ${MAX_PARTICIPANTS} members` }); return; }

  const newMember = await User.findById(userId);
  if (!newMember) { res.status(404).json({ message: 'User not found' }); return; }

  conversation.participantIds.push(newMember._id as any);
  await conversation.save();

  createNotification({
    recipientId: userId,
    actorId: req.user._id.toString(),
    actorName: req.user.name,
    actorAvatarUrl: req.user.avatarUrl,
    type: 'group_invite',
    conversationId: id,
  }).catch(() => {});

  res.json({ conversation: await toConversationDTO(conversation) });
});

// Leave (self) or remove another member (creator only).
router.delete('/:id/participants/:userId', async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const userId = req.params.userId as string;
  const conversation = await GroupConversation.findOne({ _id: id, participantIds: req.user._id });
  if (!conversation) { res.status(404).json({ message: 'Not found' }); return; }

  const meId = req.user._id.toString();
  if (userId !== meId && conversation.creatorId.toString() !== meId) {
    res.status(403).json({ message: 'Only the group creator can remove other members' }); return;
  }

  conversation.participantIds = conversation.participantIds.filter(p => p.toString() !== userId) as any;
  await conversation.save();
  res.json({ conversation: await toConversationDTO(conversation) });
});

export default router;
