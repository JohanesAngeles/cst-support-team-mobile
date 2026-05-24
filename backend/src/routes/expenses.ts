import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import Expense from '../models/Expense';

const router = Router();
router.use(protect);

router.get('/', async (req: AuthRequest, res: Response) => {
  const expenses = await Expense.find({ userId: req.user._id }).sort({ createdAt: -1 });
  res.json(expenses);
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const { category, amount, description } = req.body;
  if (!category || amount == null) { res.status(400).json({ message: 'category and amount required' }); return; }
  const expense = await Expense.create({ userId: req.user._id, category, amount, description: description ?? '' });
  res.status(201).json(expense);
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  const { category, amount, description } = req.body;
  const expense = await Expense.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { $set: { category, amount, description } },
    { new: true }
  );
  if (!expense) { res.status(404).json({ message: 'Not found' }); return; }
  res.json(expense);
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const expense = await Expense.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!expense) { res.status(404).json({ message: 'Not found' }); return; }
  res.json({ message: 'Deleted' });
});

export default router;
