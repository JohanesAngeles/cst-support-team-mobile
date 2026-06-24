import { Router, Response } from 'express';
import { AccessToken } from 'livekit-server-sdk';
import { protect, AuthRequest } from '../middleware/auth';
import LiveSession from '../models/LiveSession';

const router = Router();
router.use(protect);

const LIVEKIT_URL = process.env.LIVEKIT_URL;
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;

function mintToken(identity: string, name: string, roomName: string, canPublish: boolean) {
  const at = new AccessToken(LIVEKIT_API_KEY!, LIVEKIT_API_SECRET!, { identity, name });
  at.addGrant({ roomJoin: true, room: roomName, canPublish, canSubscribe: true });
  return at.toJwt();
}

router.get('/active', async (_req: AuthRequest, res: Response) => {
  const sessions = await LiveSession.find({ status: 'live' }).sort({ startedAt: -1 }).limit(20);
  res.json({ sessions });
});

router.post('/start', async (req: AuthRequest, res: Response) => {
  if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    res.status(503).json({ message: 'Live broadcasting is not configured' }); return;
  }
  const { title } = req.body;
  if (!title?.trim()) { res.status(400).json({ message: 'title is required' }); return; }

  await LiveSession.updateMany({ hostId: req.user._id, status: 'live' }, { status: 'ended', endedAt: new Date() });

  const roomName = `live-${req.user._id}-${Date.now()}`;
  const session = await LiveSession.create({
    hostId: req.user._id,
    hostName: req.user.name,
    hostAvatarUrl: req.user.avatarUrl,
    title: title.trim(),
    roomName,
  });

  const token = await mintToken(String(req.user._id), req.user.name, roomName, true);
  res.status(201).json({ session, token, url: LIVEKIT_URL });
});

router.post('/:id/join', async (req: AuthRequest, res: Response) => {
  if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    res.status(503).json({ message: 'Live broadcasting is not configured' }); return;
  }
  const session = await LiveSession.findOne({ _id: req.params.id, status: 'live' });
  if (!session) { res.status(404).json({ message: 'Live session not found' }); return; }

  const token = await mintToken(String(req.user._id), req.user.name, session.roomName, false);
  await LiveSession.updateOne({ _id: session._id }, { $inc: { viewerCount: 1 } });
  res.json({ session, token, url: LIVEKIT_URL });
});

router.post('/:id/leave', async (req: AuthRequest, res: Response) => {
  await LiveSession.updateOne(
    { _id: req.params.id, status: 'live', viewerCount: { $gt: 0 } },
    { $inc: { viewerCount: -1 } }
  );
  res.json({ message: 'ok' });
});

router.post('/:id/end', async (req: AuthRequest, res: Response) => {
  const session = await LiveSession.findOneAndUpdate(
    { _id: req.params.id, hostId: req.user._id },
    { status: 'ended', endedAt: new Date() },
    { new: true }
  );
  if (!session) { res.status(404).json({ message: 'Live session not found' }); return; }
  res.json({ session });
});

export default router;
