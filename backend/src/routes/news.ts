import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import NewsItem from '../models/NewsItem';

const router = Router();
router.use(protect);

router.get('/', async (_req: AuthRequest, res: Response) => {
  const news = await NewsItem.find().sort({ createdAt: -1 }).limit(50);
  res.json({ news });
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const { title, body, imageUrl } = req.body;
  if (!title || !body) {
    res.status(400).json({ message: 'title and body are required' }); return;
  }
  const item = await NewsItem.create({
    authorId: req.user._id,
    authorName: req.user.name,
    authorAvatarUrl: req.user.avatarUrl,
    title, body, imageUrl,
    upvotes: [],
  });
  res.status(201).json({ news: item });
});

router.post('/:id/upvote', async (req: AuthRequest, res: Response) => {
  const item = await NewsItem.findById(req.params.id);
  if (!item) { res.status(404).json({ message: 'Not found' }); return; }
  const uid = req.user._id.toString();
  const already = item.upvotes.map(u => u.toString()).includes(uid);
  if (already) {
    item.upvotes = item.upvotes.filter(u => u.toString() !== uid) as typeof item.upvotes;
  } else {
    item.upvotes.push(req.user._id);
  }
  await item.save();
  res.json({ news: item });
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  await NewsItem.findOneAndDelete({ _id: req.params.id, authorId: req.user._id });
  res.json({ message: 'Deleted' });
});

export default router;
