import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import ChatMessage from '../models/ChatMessage';

const VALID_CHANNELS = ['general', 'northeast', 'southeast', 'midwest', 'west', 'south'];

const router = Router();
router.use(protect);

// GET messages for a channel (last 60, optionally after a timestamp)
router.get('/:channelId', async (req: AuthRequest, res: Response) => {
  const channelId = String(req.params.channelId);
  if (!VALID_CHANNELS.includes(channelId)) {
    res.status(400).json({ message: 'Invalid channel' }); return;
  }
  const { after } = req.query;
  const query: Record<string, unknown> = { channelId };
  if (after) query.createdAt = { $gt: new Date(after as string) };
  const messages = await ChatMessage.find(query).sort({ createdAt: 1 }).limit(60);
  res.json({ messages });
});

// POST message
router.post('/:channelId', async (req: AuthRequest, res: Response) => {
  const channelId = String(req.params.channelId);
  if (!VALID_CHANNELS.includes(channelId)) {
    res.status(400).json({ message: 'Invalid channel' }); return;
  }
  const { message } = req.body;
  if (!message?.trim()) { res.status(400).json({ message: 'Message is required' }); return; }
  const msg = await ChatMessage.create({
    channelId: channelId,
    senderId:   req.user._id,
    senderName: req.user.name,
    message:    message.trim(),
  });
  res.status(201).json({ message: msg });
});

// DELETE own message
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  await ChatMessage.findOneAndDelete({ _id: req.params.id, senderId: req.user._id });
  res.json({ message: 'Deleted' });
});

export default router;
