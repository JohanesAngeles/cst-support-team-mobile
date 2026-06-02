import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import BrokerBlacklist from '../models/BrokerBlacklist';

const router = Router();
router.use(protect);

// GET — all community entries, most upvoted first
router.get('/', async (req: AuthRequest, res: Response) => {
  const { search } = req.query;
  const query: Record<string, unknown> = {};
  if (search) query.brokerName = { $regex: search as string, $options: 'i' };
  const entries = await BrokerBlacklist.find(query)
    .sort({ 'upvotes.length': -1, createdAt: -1 })
    .limit(100);
  res.json({ entries });
});

// POST — submit a new blacklist entry
router.post('/', async (req: AuthRequest, res: Response) => {
  const { brokerName, mcNum, phone, reason, category } = req.body;
  if (!brokerName || !reason || !category) {
    res.status(400).json({ message: 'brokerName, reason, and category are required' }); return;
  }
  const entry = await BrokerBlacklist.create({
    submittedBy: req.user._id,
    submitterName: req.user.name,
    brokerName, mcNum, phone, reason, category,
    upvotes: [],
  });
  res.status(201).json({ entry });
});

// POST upvote
router.post('/:id/upvote', async (req: AuthRequest, res: Response) => {
  const entry = await BrokerBlacklist.findById(req.params.id);
  if (!entry) { res.status(404).json({ message: 'Not found' }); return; }
  const uid = req.user._id.toString();
  const alreadyUpvoted = entry.upvotes.map(u => u.toString()).includes(uid);
  if (alreadyUpvoted) {
    entry.upvotes = entry.upvotes.filter(u => u.toString() !== uid) as typeof entry.upvotes;
  } else {
    entry.upvotes.push(req.user._id);
  }
  await entry.save();
  res.json({ entry });
});

// DELETE own entry
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  await BrokerBlacklist.findOneAndDelete({ _id: req.params.id, submittedBy: req.user._id });
  res.json({ message: 'Deleted' });
});

export default router;
