import { Router, Response } from 'express';
import CDLDoc from '../models/CDLDoc';
import { protect } from '../middleware/auth';
import { AuthRequest } from '../middleware/auth';

const router = Router();
router.use(protect);

router.get('/', async (req: AuthRequest, res: Response) => {
  const docs = await CDLDoc.find({ userId: req.user!._id }).sort({ expirationDate: 1 });
  res.json({ docs });
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const { docType, licenseNumber, issuingState, issueDate, expirationDate, notes } = req.body;
  if (!docType || !expirationDate) {
    res.status(400).json({ message: 'docType and expirationDate are required' });
    return;
  }
  const doc = await CDLDoc.create({ userId: req.user!._id, docType, licenseNumber, issuingState, issueDate, expirationDate, notes });
  res.status(201).json({ doc });
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  const doc = await CDLDoc.findOneAndUpdate(
    { _id: req.params.id, userId: req.user!._id },
    req.body,
    { new: true }
  );
  if (!doc) { res.status(404).json({ message: 'Not found' }); return; }
  res.json({ doc });
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  await CDLDoc.findOneAndDelete({ _id: req.params.id, userId: req.user!._id });
  res.json({ message: 'Deleted' });
});

export default router;
