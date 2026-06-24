import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import NetworkPost, { INetworkPost, ReactionType, REACTION_TYPES } from '../models/NetworkPost';

const router = Router();
router.use(protect);

function applyReaction(post: INetworkPost, userId: string, type: ReactionType) {
  const existingIndex = post.reactions.findIndex(r => r.userId.toString() === userId);
  if (existingIndex >= 0 && post.reactions[existingIndex].type === type) {
    post.reactions.splice(existingIndex, 1);
  } else if (existingIndex >= 0) {
    post.reactions[existingIndex].type = type;
  } else {
    post.reactions.push({ userId, type } as any);
  }
  post.upvotes = post.reactions.map(r => r.userId) as typeof post.upvotes;
}

router.get('/', async (req: AuthRequest, res: Response) => {
  const { category, authorId } = req.query;
  const query: Record<string, unknown> = {};
  if (category) query.category = category;
  if (authorId) query.authorId = authorId;
  const posts = await NetworkPost.find(query).sort({ createdAt: -1 }).limit(50);
  res.json({ posts });
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  const post = await NetworkPost.findById(req.params.id);
  if (!post) { res.status(404).json({ message: 'Not found' }); return; }
  res.json({ post });
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const { category, title, body, imageUrl, sharedPostId } = req.body;

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

  if (!sharedPost && (!title || !body)) {
    res.status(400).json({ message: 'title and body are required' }); return;
  }

  const post = await NetworkPost.create({
    authorId: req.user._id,
    authorName: req.user.name,
    authorAvatarUrl: req.user.avatarUrl,
    category: category || 'general',
    title: title || (sharedPost ? `Shared: ${sharedPost.title}` : ''),
    body: body || (sharedPost ? `Shared a post from ${sharedPost.authorName}` : ''),
    imageUrl,
    sharedPost,
    upvotes: [], reactions: [], replies: [],
  });
  res.status(201).json({ post });
});

router.post('/:id/upvote', async (req: AuthRequest, res: Response) => {
  const post = await NetworkPost.findById(req.params.id);
  if (!post) { res.status(404).json({ message: 'Not found' }); return; }
  applyReaction(post, req.user._id.toString(), 'like');
  await post.save();
  res.json({ post });
});

router.post('/:id/react', async (req: AuthRequest, res: Response) => {
  const { type } = req.body as { type: ReactionType };
  if (!REACTION_TYPES.includes(type)) { res.status(400).json({ message: 'Invalid reaction type' }); return; }
  const post = await NetworkPost.findById(req.params.id);
  if (!post) { res.status(404).json({ message: 'Not found' }); return; }
  applyReaction(post, req.user._id.toString(), type);
  await post.save();
  res.json({ post });
});

router.post('/:id/reply', async (req: AuthRequest, res: Response) => {
  const { body } = req.body;
  if (!body) { res.status(400).json({ message: 'body is required' }); return; }
  const post = await NetworkPost.findByIdAndUpdate(
    req.params.id,
    { $push: { replies: { authorId: req.user._id, authorName: req.user.name, authorAvatarUrl: req.user.avatarUrl, body, createdAt: new Date() } } },
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
