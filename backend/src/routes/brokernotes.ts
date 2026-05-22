import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import BrokerNote from '../models/BrokerNote';

const router = Router();
router.use(protect);

router.get('/', async (req: AuthRequest, res: Response) => {
  const notes = await BrokerNote.find({ userId: req.user._id }).sort({ createdAt: -1 });
  res.json({ notes });
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const { brokerName, mcNum, phone, paySpeed, communication, loadQuality, wouldUseAgain, notes } = req.body;
  if (!brokerName) { res.status(400).json({ message: 'brokerName is required' }); return; }
  const note = await BrokerNote.create({
    userId: req.user._id, brokerName, mcNum, phone,
    paySpeed, communication, loadQuality, wouldUseAgain, notes,
  });
  res.status(201).json({ note });
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  const note = await BrokerNote.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    req.body,
    { new: true }
  );
  if (!note) { res.status(404).json({ message: 'Not found' }); return; }
  res.json({ note });
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  await BrokerNote.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  res.json({ message: 'Deleted' });
});

export default router;
