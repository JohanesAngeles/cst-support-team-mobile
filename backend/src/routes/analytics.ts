import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import NetworkPost from '../models/NetworkPost';
import Follow from '../models/Follow';

const router = Router();
router.use(protect);

function engagementScore(p: { viewCount?: number; reactions: unknown[]; replies: unknown[]; shareCount?: number }) {
  return (p.viewCount ?? 0) + p.reactions.length * 3 + p.replies.length * 3 + (p.shareCount ?? 0) * 5;
}

// GET my creator analytics — post reach/engagement totals and follower growth
router.get('/', async (req: AuthRequest, res: Response) => {
  const authorId = req.user._id;
  const now = Date.now();
  const since7d = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const since30d = new Date(now - 30 * 24 * 60 * 60 * 1000);

  const [posts, followersTotal, followersGained7d, followersGained30d] = await Promise.all([
    NetworkPost.find({ authorId }).sort({ createdAt: -1 }),
    Follow.countDocuments({ followingId: authorId }),
    Follow.countDocuments({ followingId: authorId, createdAt: { $gte: since7d } }),
    Follow.countDocuments({ followingId: authorId, createdAt: { $gte: since30d } }),
  ]);

  const totals = posts.reduce(
    (acc, p) => {
      acc.views += p.viewCount ?? 0;
      acc.reactions += p.reactions.length;
      acc.replies += p.replies.length;
      acc.shares += p.shareCount ?? 0;
      return acc;
    },
    { views: 0, reactions: 0, replies: 0, shares: 0 }
  );

  const topPosts = [...posts]
    .sort((a, b) => engagementScore(b) - engagementScore(a))
    .slice(0, 5)
    .map(p => ({
      _id: p._id,
      title: p.title,
      body: p.body,
      imageUrl: p.imageUrl,
      viewCount: p.viewCount ?? 0,
      reactionCount: p.reactions.length,
      replyCount: p.replies.length,
      shareCount: p.shareCount ?? 0,
      createdAt: p.createdAt,
    }));

  res.json({
    totalPosts: posts.length,
    totalViews: totals.views,
    totalReactions: totals.reactions,
    totalReplies: totals.replies,
    totalShares: totals.shares,
    followersTotal,
    followersGained7d,
    followersGained30d,
    topPosts,
  });
});

export default router;
