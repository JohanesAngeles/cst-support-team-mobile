import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import NetworkPost from '../models/NetworkPost';

const router = Router();
router.use(protect);

router.get('/', async (req: AuthRequest, res: Response) => {
  const { category } = req.query;
  const query: Record<string, unknown> = {};
  if (category) query.category = category;
  const posts = await NetworkPost.find(query).sort({ createdAt: -1 }).limit(50);
  res.json({ posts });
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  const post = await NetworkPost.findById(req.params.id);
  if (!post) { res.status(404).json({ message: 'Not found' }); return; }
  res.json({ post });
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const { category, title, body } = req.body;
  if (!category || !title || !body) {
    res.status(400).json({ message: 'category, title, and body are required' }); return;
  }
  const post = await NetworkPost.create({
    authorId: req.user._id,
    authorName: req.user.name,
    category, title, body,
    upvotes: [], replies: [],
  });
  res.status(201).json({ post });
});

router.post('/:id/upvote', async (req: AuthRequest, res: Response) => {
  const post = await NetworkPost.findById(req.params.id);
  if (!post) { res.status(404).json({ message: 'Not found' }); return; }
  const uid = req.user._id.toString();
  const already = post.upvotes.map(u => u.toString()).includes(uid);
  if (already) {
    post.upvotes = post.upvotes.filter(u => u.toString() !== uid) as typeof post.upvotes;
  } else {
    post.upvotes.push(req.user._id);
  }
  await post.save();
  res.json({ post });
});

router.post('/:id/reply', async (req: AuthRequest, res: Response) => {
  const { body } = req.body;
  if (!body) { res.status(400).json({ message: 'body is required' }); return; }
  const post = await NetworkPost.findByIdAndUpdate(
    req.params.id,
    { $push: { replies: { authorId: req.user._id, authorName: req.user.name, body, createdAt: new Date() } } },
    { new: true }
  );
  if (!post) { res.status(404).json({ message: 'Not found' }); return; }
  res.json({ post });
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  await NetworkPost.findOneAndDelete({ _id: req.params.id, authorId: req.user._id });
  res.json({ message: 'Deleted' });
});

export default router;
