import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import DispatchContact from '../models/DispatchContact';

const router = Router();
router.use(protect);

router.get('/', async (req: AuthRequest, res: Response) => {
  const contacts = await DispatchContact.find({ userId: req.user._id }).sort({ isFavorite: -1, name: 1 });
  res.json({ contacts });
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const { name, company, role, phone, email, mcNumber, notes, isFavorite } = req.body;
  if (!name?.trim()) { res.status(400).json({ message: 'name is required' }); return; }
  const contact = await DispatchContact.create({
    userId: req.user._id, name: name.trim(), company, role, phone, email, mcNumber, notes, isFavorite,
  });
  res.status(201).json({ contact });
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  const { name, company, role, phone, email, mcNumber, notes, isFavorite } = req.body;
  const contact = await DispatchContact.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { $set: { name, company, role, phone, email, mcNumber, notes, isFavorite } },
    { new: true, runValidators: true }
  );
  if (!contact) { res.status(404).json({ message: 'Not found' }); return; }
  res.json({ contact });
});

router.patch('/:id/favorite', async (req: AuthRequest, res: Response) => {
  const contact = await DispatchContact.findOne({ _id: req.params.id, userId: req.user._id });
  if (!contact) { res.status(404).json({ message: 'Not found' }); return; }
  contact.isFavorite = !contact.isFavorite;
  await contact.save();
  res.json({ contact });
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  await DispatchContact.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  res.json({ message: 'Deleted' });
});

export default router;
