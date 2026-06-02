import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import DrugTest from '../models/DrugTest';

const router = Router();
router.use(protect);

router.get('/', async (req: AuthRequest, res: Response) => {
  const tests = await DrugTest.find({ userId: req.user._id }).sort({ date: -1 });
  res.json({ tests });
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const { date, testType, result, testingCompany, clearinghouse, notes } = req.body;
  if (!date || !testType || !testingCompany) {
    res.status(400).json({ message: 'date, testType, and testingCompany are required' }); return;
  }
  const test = await DrugTest.create({ userId: req.user._id, date, testType, result, testingCompany, clearinghouse, notes });
  res.status(201).json({ test });
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  const test = await DrugTest.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    req.body,
    { new: true }
  );
  if (!test) { res.status(404).json({ message: 'Not found' }); return; }
  res.json({ test });
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  await DrugTest.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  res.json({ message: 'Deleted' });
});

export default router;
