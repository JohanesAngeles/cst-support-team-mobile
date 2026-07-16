import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import ConvoyLocation from '../models/ConvoyLocation';
import Group from '../models/Group';

const router = Router();
router.use(protect);

// Stale entries (no update in the last 15 min) are excluded — the driver likely stopped sharing.
const STALE_MS = 15 * 60 * 1000;

// GET current members' shared locations for a convoy/crew
router.get('/:groupId', async (req: AuthRequest, res: Response) => {
  const isMember = await Group.exists({ _id: req.params.groupId, members: req.user._id });
  if (!isMember) { res.status(403).json({ message: 'You must be a member of this group' }); return; }

  const cutoff = new Date(Date.now() - STALE_MS);
  const locations = await ConvoyLocation.find({ groupId: req.params.groupId, updatedAt: { $gte: cutoff } });
  res.json({ locations });
});

// PUT — upsert my current location (opt-in, called while sharing is active)
router.put('/:groupId', async (req: AuthRequest, res: Response) => {
  const { lat, lng } = req.body as { lat: number; lng: number };
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    res.status(400).json({ message: 'lat and lng are required' }); return;
  }
  const isMember = await Group.exists({ _id: req.params.groupId, members: req.user._id });
  if (!isMember) { res.status(403).json({ message: 'You must be a member of this group' }); return; }

  const location = await ConvoyLocation.findOneAndUpdate(
    { groupId: req.params.groupId, userId: req.user._id },
    { userName: req.user.name, userAvatarUrl: req.user.avatarUrl, lat, lng, updatedAt: new Date() },
    { new: true, upsert: true }
  );
  res.json({ location });
});

// DELETE — stop sharing my location with this group
router.delete('/:groupId', async (req: AuthRequest, res: Response) => {
  await ConvoyLocation.findOneAndDelete({ groupId: req.params.groupId, userId: req.user._id });
  res.json({ message: 'Stopped sharing' });
});

export default router;
