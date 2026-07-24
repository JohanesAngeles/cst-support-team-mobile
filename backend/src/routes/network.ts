import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import NetworkPost, { INetworkPost, ReactionType, REACTION_TYPES } from '../models/NetworkPost';
import Group from '../models/Group';
import SavedPost from '../models/SavedPost';
import Follow from '../models/Follow';
import { hiddenAuthorIds } from '../utils/visibility';
import { createNotification } from '../utils/notify';
import { resolveMentions } from '../utils/mentions';
import { getFriendIds } from '../utils/friendStatus';

// Pulls lowercased #hashtag tokens out of post text, deduped, in first-seen order.
function extractHashtags(body: string): string[] {
  const matches = body.match(/#(\w+)/g) ?? [];
  return [...new Set(matches.map(m => m.slice(1).toLowerCase()))];
}

const router = Router();
router.use(protect);

async function canViewPost(post: INetworkPost, userId: string): Promise<boolean> {
  if (post.authorId.toString() === userId) return true;
  if (!post.visibility || post.visibility === 'public') return true;
  if (post.visibility === 'followers') {
    return !!(await Follow.exists({ followerId: userId, followingId: post.authorId }));
  }
  if (post.visibility === 'friends') {
    const friendIds = await getFriendIds(userId);
    return friendIds.includes(post.authorId.toString());
  }
  if (post.visibility === 'convoy') {
    if (!post.groupId) return false;
    return !!(await Group.exists({ _id: post.groupId, members: userId }));
  }
  return true;
}

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

async function notifyMentions(text: string, postId: string, postTitle: string, actor: AuthRequest['user']) {
  const mentioned = await resolveMentions(text, actor._id.toString());
  for (const u of mentioned) {
    createNotification({
      recipientId: u._id.toString(),
      actorId: actor._id.toString(),
      actorName: actor.name,
      actorAvatarUrl: actor.avatarUrl,
      type: 'mention',
      postId,
      postTitle,
    }).catch(() => {});
  }
}

function notifyReaction(post: INetworkPost, actor: AuthRequest['user'], type: ReactionType) {
  createNotification({
    recipientId: post.authorId.toString(),
    actorId: actor._id.toString(),
    actorName: actor.name,
    actorAvatarUrl: actor.avatarUrl,
    type: 'reaction',
    postId: post._id.toString(),
    postTitle: post.title || post.body.slice(0, 60),
    reactionType: type,
  }).catch(() => {});
}

router.get('/', async (req: AuthRequest, res: Response) => {
  const { category, authorId, groupId, feed, hashtag, onlyVideo } = req.query;
  const query: Record<string, unknown> = {};
  if (category) query.category = category;
  if (groupId) query.groupId = groupId;
  if (hashtag) query.hashtags = hashtag.toString().toLowerCase();
  if (onlyVideo === 'true') query.videoUrl = { $exists: true, $ne: null };

  const userId = req.user._id.toString();
  const [hidden, myFollows, myGroups, friendIds] = await Promise.all([
    hiddenAuthorIds(userId),
    Follow.find({ followerId: req.user._id }).select('followingId'),
    Group.find({ members: req.user._id }).select('_id'),
    getFriendIds(userId),
  ]);
  const followingIds = myFollows.map(f => f.followingId.toString());
  const myGroupIds = myGroups.map(g => g._id.toString());

  if (authorId) {
    if (hidden.includes(authorId.toString())) { res.json({ posts: [], savedPostIds: [] }); return; }
    query.authorId = authorId;
  } else if (feed === 'following') {
    query.authorId = { $in: [...followingIds, userId].filter(id => !hidden.includes(id)) };
  } else if (hidden.length > 0) {
    query.authorId = { $nin: hidden };
  }

  // Visibility: public posts show to everyone; followers-only posts only to followers;
  // friends-only posts only to friends; convoy-only posts only to fellow group members.
  query.$or = [
    { visibility: { $exists: false } },
    { visibility: 'public' },
    { visibility: 'followers', authorId: { $in: [...followingIds, userId] } },
    { visibility: 'friends', authorId: { $in: [...friendIds, userId] } },
    { visibility: 'convoy', groupId: { $in: myGroupIds } },
    { authorId: userId },
  ];

  const useForYouRanking = feed === 'forYou' && !authorId && !groupId;

  const [posts, saves] = await Promise.all([
    useForYouRanking ? rankForYou(query, friendIds) : NetworkPost.find(query).sort({ createdAt: -1 }).limit(50),
    SavedPost.find({ userId: req.user._id }).select('postId'),
  ]);
  res.json({ posts, savedPostIds: saves.map(s => s.postId.toString()) });
});

// "For You" hot ranking: engagement decayed by age, HN-style, so fresh zero-engagement
// posts still surface (the +1 baseline) while genuinely popular posts stay up longer.
// Posts from friends get a boost, giving the friend relationship a real feed benefit.
async function rankForYou(query: Record<string, unknown>, friendIds: string[]) {
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const candidates = await NetworkPost.find({ ...query, createdAt: { $gte: since } })
    .sort({ createdAt: -1 })
    .limit(300);

  const friendSet = new Set(friendIds);
  const scored = candidates.map(post => {
    const ageHours = (Date.now() - post.createdAt.getTime()) / (1000 * 60 * 60);
    const engagement = post.reactions.length + post.replies.length * 2 + post.shareCount * 1.5 + post.viewCount * 0.1;
    const friendBoost = friendSet.has(post.authorId.toString()) ? 1.5 : 1;
    const score = friendBoost * (engagement + 1) / Math.pow(ageHours + 2, 1.5);
    return { post, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 50).map(s => s.post);
}

// Must come before /:id so "hashtags" isn't parsed as a post id
router.get('/hashtags/trending', async (req: AuthRequest, res: Response) => {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const trending = await NetworkPost.aggregate([
    { $match: { createdAt: { $gte: since }, hashtags: { $exists: true, $ne: [] } } },
    { $unwind: '$hashtags' },
    { $group: { _id: '$hashtags', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 12 },
  ]);
  res.json({ hashtags: trending.map(t => ({ tag: t._id, count: t.count })) });
});

// Must come before /:id so "saved" isn't parsed as a post id
router.get('/saved', async (req: AuthRequest, res: Response) => {
  const saves = await SavedPost.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(200);
  const posts = await NetworkPost.find({ _id: { $in: saves.map(s => s.postId) } });
  const byId = new Map(posts.map(p => [p._id.toString(), p]));
  const ordered = saves.map(s => byId.get(s.postId.toString())).filter(Boolean);
  res.json({ posts: ordered });
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  const post = await NetworkPost.findById(req.params.id);
  if (!post) { res.status(404).json({ message: 'Not found' }); return; }
  if (!(await canViewPost(post, req.user._id.toString()))) { res.status(404).json({ message: 'Not found' }); return; }
  if (post.authorId.toString() !== req.user._id.toString()) {
    post.viewCount = (post.viewCount ?? 0) + 1;
    await post.save();
  }
  const isSaved = await SavedPost.exists({ userId: req.user._id, postId: post._id });
  res.json({ post, isSaved: !!isSaved });
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const {
    category, title, body, imageUrl, location, lat, lng, sharedPostId, groupId,
    videoUrl, videoThumbnailUrl, poll, visibility,
  } = req.body;

  if (visibility && !['public', 'followers', 'friends', 'convoy'].includes(visibility)) {
    res.status(400).json({ message: 'Invalid visibility' }); return;
  }
  if (visibility === 'convoy' && !groupId) {
    res.status(400).json({ message: 'Convoy-only posts must belong to a group' }); return;
  }

  let pollDoc;
  if (poll) {
    const options: string[] = (poll.options ?? []).map((o: string) => o?.trim()).filter(Boolean);
    if (!poll.question?.trim() || options.length < 2 || options.length > 4) {
      res.status(400).json({ message: 'Poll needs a question and 2-4 options' }); return;
    }
    pollDoc = { question: poll.question.trim(), options: options.map(text => ({ text, votes: [] })) };
  }

  let group;
  if (groupId) {
    group = await Group.findOne({ _id: groupId, members: req.user._id });
    if (!group) { res.status(403).json({ message: 'You must join this crew to post' }); return; }
  }

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
    original.shareCount = (original.shareCount ?? 0) + 1;
    await original.save();
    createNotification({
      recipientId: original.authorId.toString(),
      actorId: req.user._id.toString(),
      actorName: req.user.name,
      actorAvatarUrl: req.user.avatarUrl,
      type: 'share',
      postId: original._id.toString(),
      postTitle: original.title || original.body.slice(0, 60),
    }).catch(() => {});
  }

  if (!sharedPost && (!title || !body)) {
    res.status(400).json({ message: 'title and body are required' }); return;
  }

  const finalBody = body || (sharedPost ? `Shared a post from ${sharedPost.authorName}` : '');

  const post = await NetworkPost.create({
    authorId: req.user._id,
    authorName: req.user.name,
    authorAvatarUrl: req.user.avatarUrl,
    authorIsTopDriver: req.user.isTopDriver,
    category: category || 'general',
    visibility: visibility || 'public',
    title: title || (sharedPost ? `Shared: ${sharedPost.title}` : ''),
    body: finalBody,
    imageUrl,
    videoUrl,
    videoThumbnailUrl,
    location: location || req.user.homeBase,
    lat: typeof lat === 'number' ? lat : undefined,
    lng: typeof lng === 'number' ? lng : undefined,
    groupId: group?._id,
    groupName: group?.name,
    groupCreatorId: group?.creatorId,
    sharedPost,
    poll: pollDoc,
    hashtags: extractHashtags(finalBody),
    shareCount: 0,
    upvotes: [], reactions: [], replies: [],
  });
  notifyMentions(finalBody, post._id.toString(), post.title, req.user).catch(() => {});
  res.status(201).json({ post });
});

router.post('/:id/upvote', async (req: AuthRequest, res: Response) => {
  const post = await NetworkPost.findById(req.params.id);
  if (!post) { res.status(404).json({ message: 'Not found' }); return; }
  applyReaction(post, req.user._id.toString(), 'like');
  await post.save();
  notifyReaction(post, req.user, 'like');
  res.json({ post });
});

router.post('/:id/react', async (req: AuthRequest, res: Response) => {
  const { type } = req.body as { type: ReactionType };
  if (!REACTION_TYPES.includes(type)) { res.status(400).json({ message: 'Invalid reaction type' }); return; }
  const post = await NetworkPost.findById(req.params.id);
  if (!post) { res.status(404).json({ message: 'Not found' }); return; }
  applyReaction(post, req.user._id.toString(), type);
  await post.save();
  notifyReaction(post, req.user, type);
  res.json({ post });
});

// Toggle save/unsave — returns the new saved state so the client can update instantly
router.post('/:id/save', async (req: AuthRequest, res: Response) => {
  const post = await NetworkPost.findById(req.params.id);
  if (!post) { res.status(404).json({ message: 'Not found' }); return; }

  const existing = await SavedPost.findOne({ userId: req.user._id, postId: post._id });
  if (existing) {
    await existing.deleteOne();
    res.json({ saved: false });
  } else {
    await SavedPost.create({ userId: req.user._id, postId: post._id });
    res.json({ saved: true });
  }
});

router.post('/:id/reply', async (req: AuthRequest, res: Response) => {
  const { body, parentReplyId } = req.body;
  if (!body) { res.status(400).json({ message: 'body is required' }); return; }

  const post = await NetworkPost.findById(req.params.id);
  if (!post) { res.status(404).json({ message: 'Not found' }); return; }

  const parentReply = parentReplyId ? post.replies.find(r => r._id.toString() === parentReplyId) : undefined;
  if (parentReplyId && !parentReply) {
    res.status(400).json({ message: 'Parent reply not found' }); return;
  }

  post.replies.push({
    authorId: req.user._id,
    authorName: req.user.name,
    authorAvatarUrl: req.user.avatarUrl,
    body,
    parentReplyId: parentReplyId || undefined,
    createdAt: new Date(),
  } as any);
  await post.save();

  const actorId = req.user._id.toString();
  const notifyBase = {
    actorId,
    actorName: req.user.name,
    actorAvatarUrl: req.user.avatarUrl,
    type: 'reply' as const,
    postId: post._id.toString(),
    postTitle: post.title || post.body.slice(0, 60),
  };
  createNotification({ ...notifyBase, recipientId: post.authorId.toString() }).catch(() => {});
  if (parentReply && parentReply.authorId.toString() !== post.authorId.toString()) {
    createNotification({ ...notifyBase, recipientId: parentReply.authorId.toString() }).catch(() => {});
  }
  notifyMentions(body, post._id.toString(), post.title, req.user).catch(() => {});

  res.json({ post });
});

router.post('/:id/vote', async (req: AuthRequest, res: Response) => {
  const { optionIndex } = req.body as { optionIndex: number };
  const post = await NetworkPost.findById(req.params.id);
  if (!post) { res.status(404).json({ message: 'Not found' }); return; }
  if (!post.poll || !post.poll.options[optionIndex]) { res.status(400).json({ message: 'Invalid poll option' }); return; }

  const userId = req.user._id.toString();
  const previousIdx = post.poll.options.findIndex(opt => opt.votes.some(v => v.toString() === userId));
  if (previousIdx >= 0) {
    post.poll.options[previousIdx].votes = post.poll.options[previousIdx].votes.filter(v => v.toString() !== userId) as any;
  }
  if (previousIdx !== optionIndex) {
    post.poll.options[optionIndex].votes.push(req.user._id as any);
  }
  post.markModified('poll');
  await post.save();
  res.json({ post });
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  const { title, body, imageUrl, location, lat, lng, visibility } = req.body;
  const post = await NetworkPost.findOne({ _id: req.params.id, authorId: req.user._id });
  if (!post) { res.status(404).json({ message: 'Not found' }); return; }
  if (post.sharedPost) { res.status(400).json({ message: 'Shared posts cannot be edited' }); return; }

  if (body !== undefined) post.body = body;
  if (title !== undefined) post.title = title;
  if (imageUrl !== undefined) post.imageUrl = imageUrl;
  if (location !== undefined) post.location = location;
  if (typeof lat === 'number') post.lat = lat;
  if (typeof lng === 'number') post.lng = lng;
  if (visibility !== undefined) {
    if (!['public', 'followers', 'friends', 'convoy'].includes(visibility)) { res.status(400).json({ message: 'Invalid visibility' }); return; }
    if (visibility === 'convoy' && !post.groupId) { res.status(400).json({ message: 'Convoy-only posts must belong to a group' }); return; }
    post.visibility = visibility;
  }
  if (!post.body?.trim()) { res.status(400).json({ message: 'body is required' }); return; }

  post.hashtags = extractHashtags(post.body);
  post.editedAt = new Date();
  await post.save();
  res.json({ post });
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const post = await NetworkPost.findOneAndDelete({ _id: req.params.id, authorId: req.user._id });
  if (post) await SavedPost.deleteMany({ postId: post._id });
  res.json({ message: 'Deleted' });
});

export default router;
