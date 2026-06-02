import { Router, Response } from 'express';
import CargoClaim from '../models/CargoClaim';
import { protect, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(protect);

router.get('/', async (req: AuthRequest, res: Response) => {
  const claims = await CargoClaim.find({ userId: req.user!._id }).sort({ createdAt: -1 });
  res.json({ claims });
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const { loadNumber, incidentDate, shipper, receiver, issueType, description, estimatedLoss, notes } = req.body;
  if (!incidentDate || !issueType || !description) {
    res.status(400).json({ message: 'incidentDate, issueType, and description are required' });
    return;
  }
  const count = await CargoClaim.countDocuments({ userId: req.user!._id });
  const claimNumber = `CLM-${String(count + 1).padStart(4, '0')}`;
  const claim = await CargoClaim.create({
    userId: req.user!._id, claimNumber, loadNumber, incidentDate, shipper, receiver,
    issueType, description, estimatedLoss, notes, status: 'Draft',
  });
  res.status(201).json({ claim });
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  const claim = await CargoClaim.findOneAndUpdate(
    { _id: req.params.id, userId: req.user!._id },
    req.body,
    { new: true }
  );
  if (!claim) { res.status(404).json({ message: 'Not found' }); return; }
  res.json({ claim });
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  await CargoClaim.findOneAndDelete({ _id: req.params.id, userId: req.user!._id });
  res.json({ message: 'Deleted' });
});

export default router;
