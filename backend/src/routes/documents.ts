import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import UserDocument from '../models/UserDocument';

const router = Router();
router.use(protect);

router.get('/', async (req: AuthRequest, res: Response) => {
  const docs = await UserDocument.find({ userId: req.user._id }).sort({ createdAt: -1 });
  res.json(docs);
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const { name, icon, status } = req.body;
  if (!name) { res.status(400).json({ message: 'name required' }); return; }
  const doc = await UserDocument.create({ userId: req.user._id, name, icon: icon ?? 'document-outline', status: status ?? 'Active' });
  res.status(201).json(doc);
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const doc = await UserDocument.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!doc) { res.status(404).json({ message: 'Not found' }); return; }
  res.json({ message: 'Deleted' });
});

export default router;
