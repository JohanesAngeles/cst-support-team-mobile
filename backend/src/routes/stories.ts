import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import Story from '../models/Story';
import Follow from '../models/Follow';
import { hiddenAuthorIds } from '../utils/visibility';
import { getFriendIds } from '../utils/friendStatus';

const STORY_LIFETIME_MS = 24 * 60 * 60 * 1000;

const router = Router();
router.use(protect);

// Active stories from people the user follows + their own, grouped by author.
router.get('/', async (req: AuthRequest, res: Response) => {
  const [follows, hidden, friendIds] = await Promise.all([
    Follow.find({ followerId: req.user._id }).select('followingId'),
    hiddenAuthorIds(req.user._id.toString()),
    getFriendIds(req.user._id.toString()),
  ]);
  const followingIds = follows.map(f => f.followingId.toString());
  const authorIds = [...new Set([...followingIds, ...friendIds, req.user._id.toString()])].filter(id => !hidden.includes(id));

  const stories = await Story.find({ authorId: { $in: authorIds } }).sort({ createdAt: -1 });

  const grouped = new Map<string, typeof stories>();
  for (const story of stories) {
    const key = story.authorId.toString();
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(story);
  }

  res.json({
    groups: [...grouped.entries()].map(([authorId, authorStories]) => ({
      authorId,
      authorName: authorStories[0].authorName,
      authorAvatarUrl: authorStories[0].authorAvatarUrl,
      stories: authorStories,
      hasUnviewed: authorStories.some(s => !s.viewedBy.some(v => v.toString() === req.user._id.toString())),
    })),
  });
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const { mediaUrl, mediaType, caption, location, lat, lng, driverStatus } = req.body;
  if (!mediaUrl || !['image', 'video'].includes(mediaType)) {
    res.status(400).json({ message: 'mediaUrl and a valid mediaType are required' }); return;
  }

  const story = await Story.create({
    authorId: req.user._id,
    authorName: req.user.name,
    authorAvatarUrl: req.user.avatarUrl,
    mediaUrl,
    mediaType,
    caption,
    location,
    lat: typeof lat === 'number' ? lat : undefined,
    lng: typeof lng === 'number' ? lng : undefined,
    driverStatus,
    viewedBy: [],
    expiresAt: new Date(Date.now() + STORY_LIFETIME_MS),
  });
  res.status(201).json({ story });
});

router.post('/:id/view', async (req: AuthRequest, res: Response) => {
  const story = await Story.findById(req.params.id);
  if (!story) { res.status(404).json({ message: 'Not found' }); return; }
  if (!story.viewedBy.some(v => v.toString() === req.user._id.toString())) {
    story.viewedBy.push(req.user._id as any);
    await story.save();
  }
  res.json({ story });
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  await Story.findOneAndDelete({ _id: req.params.id, authorId: req.user._id });
  res.json({ message: 'Deleted' });
});

export default router;
