import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import StoryHighlight, { IHighlightItem } from '../models/StoryHighlight';
import Story from '../models/Story';

const router = Router();
router.use(protect);

router.get('/', async (req: AuthRequest, res: Response) => {
  const authorId = (req.query.authorId as string) || req.user._id.toString();
  const highlights = await StoryHighlight.find({ authorId }).sort({ createdAt: 1 });
  res.json({ highlights });
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const { title, storyId } = req.body;
  if (!title || !storyId) { res.status(400).json({ message: 'title and storyId are required' }); return; }

  const story = await Story.findById(storyId);
  if (!story) { res.status(404).json({ message: 'Story not found' }); return; }
  if (story.authorId.toString() !== req.user._id.toString()) { res.status(403).json({ message: 'Not your story' }); return; }

  const highlight = await StoryHighlight.create({
    authorId: req.user._id,
    authorName: req.user.name,
    title: title.trim().slice(0, 30),
    coverImageUrl: story.mediaType === 'image' ? story.mediaUrl : undefined,
    items: [{
      mediaUrl: story.mediaUrl,
      mediaType: story.mediaType,
      caption: story.caption,
      addedAt: new Date(),
    }],
  });
  res.status(201).json({ highlight });
});

router.post('/:id/items', async (req: AuthRequest, res: Response) => {
  const { storyId } = req.body;
  if (!storyId) { res.status(400).json({ message: 'storyId is required' }); return; }

  const highlight = await StoryHighlight.findOne({ _id: req.params.id, authorId: req.user._id });
  if (!highlight) { res.status(404).json({ message: 'Highlight not found' }); return; }

  const story = await Story.findById(storyId);
  if (!story) { res.status(404).json({ message: 'Story not found' }); return; }
  if (story.authorId.toString() !== req.user._id.toString()) { res.status(403).json({ message: 'Not your story' }); return; }

  highlight.items.push({
    mediaUrl: story.mediaUrl,
    mediaType: story.mediaType,
    caption: story.caption,
    addedAt: new Date(),
  } as IHighlightItem);
  if (!highlight.coverImageUrl && story.mediaType === 'image') highlight.coverImageUrl = story.mediaUrl;
  await highlight.save();
  res.json({ highlight });
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  const { title } = req.body;
  if (!title) { res.status(400).json({ message: 'title is required' }); return; }
  const highlight = await StoryHighlight.findOneAndUpdate(
    { _id: req.params.id, authorId: req.user._id },
    { title: title.trim().slice(0, 30) },
    { new: true },
  );
  if (!highlight) { res.status(404).json({ message: 'Highlight not found' }); return; }
  res.json({ highlight });
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  await StoryHighlight.findOneAndDelete({ _id: req.params.id, authorId: req.user._id });
  res.json({ message: 'Deleted' });
});

export default router;
