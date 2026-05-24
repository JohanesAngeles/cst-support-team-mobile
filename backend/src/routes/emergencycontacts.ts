import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import EmergencyContact from '../models/EmergencyContact';

const router = Router();
router.use(protect);

router.get('/', async (req: AuthRequest, res: Response) => {
  const contacts = await EmergencyContact.find({ userId: req.user._id }).sort({ createdAt: 1 });
  res.json(contacts);
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const { name, phone, relationship } = req.body;
  if (!name || !phone) { res.status(400).json({ message: 'name and phone required' }); return; }
  const contact = await EmergencyContact.create({
    userId: req.user._id, name, phone, relationship: relationship ?? 'Other',
  });
  res.status(201).json(contact);
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  await EmergencyContact.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  res.json({ message: 'Deleted' });
});

export default router;
