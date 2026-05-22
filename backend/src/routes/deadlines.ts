import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import Deadline from '../models/Deadline';

const router = Router();
router.use(protect);

router.get('/', async (req: AuthRequest, res: Response) => {
  const deadlines = await Deadline.find({ userId: req.user._id }).sort({ date: 1 });
  res.json(deadlines);
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const { type, title, date, notes } = req.body;
  if (!title || !date) { res.status(400).json({ message: 'title and date required' }); return; }
  const deadline = await Deadline.create({ userId: req.user._id, type: type ?? 'Other', title, date, notes });
  res.status(201).json(deadline);
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const deadline = await Deadline.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!deadline) { res.status(404).json({ message: 'Not found' }); return; }
  res.json({ message: 'Deleted' });
});

export default router;
