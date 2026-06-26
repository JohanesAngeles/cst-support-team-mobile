import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import Group from '../models/Group';

const router = Router();
router.use(protect);

router.get('/', async (req: AuthRequest, res: Response) => {
  const { type } = req.query;
  const query: Record<string, unknown> = {};
  if (type) query.type = type;
  const groups = await Group.find(query).sort({ createdAt: -1 }).limit(100);
  const result = groups.map(g => ({
    _id: g._id,
    name: g.name,
    description: g.description,
    avatarUrl: g.avatarUrl,
    creatorName: g.creatorName,
    memberCount: g.members.length,
    isMember: g.members.some(m => m.toString() === req.user._id.toString()),
    type: g.type,
    originCity: g.originCity,
    destinationCity: g.destinationCity,
    departureAt: g.departureAt,
    createdAt: g.createdAt,
  }));
  res.json({ groups: result });
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const { name, description, avatarUrl, type, originCity, destinationCity, departureAt } = req.body;
  if (!name?.trim()) { res.status(400).json({ message: 'name is required' }); return; }
  const group = await Group.create({
    name: name.trim(),
    description,
    avatarUrl,
    creatorId: req.user._id,
    creatorName: req.user.name,
    members: [req.user._id],
    type: type === 'convoy' ? 'convoy' : 'crew',
    originCity,
    destinationCity,
    departureAt,
  });
  res.status(201).json({ group });
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  const group = await Group.findById(req.params.id);
  if (!group) { res.status(404).json({ message: 'Crew not found' }); return; }
  res.json({
    group: {
      _id: group._id,
      name: group.name,
      description: group.description,
      avatarUrl: group.avatarUrl,
      creatorName: group.creatorName,
      memberCount: group.members.length,
      isMember: group.members.some(m => m.toString() === req.user._id.toString()),
      type: group.type,
      originCity: group.originCity,
      destinationCity: group.destinationCity,
      departureAt: group.departureAt,
      createdAt: group.createdAt,
    },
  });
});

router.post('/:id/join', async (req: AuthRequest, res: Response) => {
  const group = await Group.findByIdAndUpdate(
    req.params.id,
    { $addToSet: { members: req.user._id } },
    { new: true }
  );
  if (!group) { res.status(404).json({ message: 'Crew not found' }); return; }
  res.json({ memberCount: group.members.length, isMember: true });
});

router.post('/:id/leave', async (req: AuthRequest, res: Response) => {
  const group = await Group.findByIdAndUpdate(
    req.params.id,
    { $pull: { members: req.user._id } },
    { new: true }
  );
  if (!group) { res.status(404).json({ message: 'Crew not found' }); return; }
  res.json({ memberCount: group.members.length, isMember: false });
});

export default router;
