import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import SponsoredPost from '../models/SponsoredPost';

const router = Router();
router.use(protect);

// A small rotating set for the client to interleave into the feed — capped so a
// refresh doesn't always show the exact same sponsored posts in the same order.
router.get('/active', async (_req: AuthRequest, res: Response) => {
  const posts = await SponsoredPost.aggregate([
    { $match: { active: true } },
    { $sample: { size: 5 } },
  ]);
  res.json({ posts });
});

router.post('/:id/impression', async (req: AuthRequest, res: Response) => {
  await SponsoredPost.findByIdAndUpdate(req.params.id, { $inc: { impressions: 1 } });
  res.json({ message: 'ok' });
});

router.post('/:id/click', async (req: AuthRequest, res: Response) => {
  await SponsoredPost.findByIdAndUpdate(req.params.id, { $inc: { clicks: 1 } });
  res.json({ message: 'ok' });
});

export default router;
