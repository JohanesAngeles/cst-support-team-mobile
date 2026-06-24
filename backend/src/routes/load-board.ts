import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import LoadBoardPost from '../models/LoadBoardPost';

const router = Router();
router.use(protect);

// GET /api/load-board — browse open freight postings
router.get('/', async (req: AuthRequest, res: Response) => {
  const { equipmentType, originState, destState } = req.query;
  const filter: Record<string, any> = { status: 'open' };
  if (equipmentType) filter.equipmentType = { $regex: new RegExp(equipmentType as string, 'i') };
  if (originState)   filter.originState  = { $regex: new RegExp(originState as string, 'i') };
  if (destState)      filter.destState    = { $regex: new RegExp(destState as string, 'i') };

  const posts = await LoadBoardPost.find(filter).sort({ createdAt: -1 }).limit(100);
  res.json({ posts });
});

// POST /api/load-board — post a load
router.post('/', async (req: AuthRequest, res: Response) => {
  const { equipmentType, originCity, originState, destCity, destState, rate, miles, weight, commodity, pickupDate, notes, contactPhone } = req.body;
  if (!equipmentType || !originCity || !originState || !destCity || !destState || rate == null) {
    res.status(400).json({ message: 'equipmentType, originCity, originState, destCity, destState, and rate are required' });
    return;
  }
  const post = await LoadBoardPost.create({
    postedBy: req.user._id,
    postedByName: req.user.name,
    equipmentType, originCity, originState, destCity, destState, rate,
    miles, weight, commodity, pickupDate, notes, contactPhone,
  });
  res.status(201).json({ post });
});

// PATCH /api/load-board/:id/cover — mark a posting as covered (owner only)
router.patch('/:id/cover', async (req: AuthRequest, res: Response) => {
  const post = await LoadBoardPost.findOneAndUpdate(
    { _id: req.params.id, postedBy: req.user._id },
    { $set: { status: 'covered' } },
    { new: true }
  );
  if (!post) { res.status(404).json({ message: 'Not found' }); return; }
  res.json({ post });
});

// DELETE /api/load-board/:id — remove a posting (owner only)
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  await LoadBoardPost.findOneAndDelete({ _id: req.params.id, postedBy: req.user._id });
  res.json({ message: 'Deleted' });
});

export default router;
