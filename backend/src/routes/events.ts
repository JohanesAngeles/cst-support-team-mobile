import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import Event from '../models/Event';

const router = Router();
router.use(protect);

router.get('/', async (_req: AuthRequest, res: Response) => {
  const events = await Event.find({ date: { $gte: new Date() } }).sort({ date: 1 }).limit(50);
  res.json({ events });
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const { title, description, date, location } = req.body;
  if (!title || !date || !location) {
    res.status(400).json({ message: 'title, date and location are required' }); return;
  }
  const event = await Event.create({
    authorId: req.user._id,
    authorName: req.user.name,
    title, description, date, location,
  });
  res.status(201).json({ event });
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  await Event.findOneAndDelete({ _id: req.params.id, authorId: req.user._id });
  res.json({ message: 'Deleted' });
});

export default router;
