import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import Expense from '../models/Expense';

const router = Router();
router.use(protect);

router.get('/', async (req: AuthRequest, res: Response) => {
  const filter: Record<string, any> = { userId: req.user._id };
  if (req.query.tripId) filter.tripId = req.query.tripId;
  const expenses = await Expense.find(filter).sort({ createdAt: -1 });
  res.json(expenses);
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const { category, amount, description, tripId, receiptUrl } = req.body;
  if (!category || amount == null) { res.status(400).json({ message: 'category and amount required' }); return; }
  const expense = await Expense.create({ userId: req.user._id, category, amount, description: description ?? '', tripId: tripId || null, receiptUrl: receiptUrl || '' });
  res.status(201).json(expense);
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  const { category, amount, description, tripId, receiptUrl } = req.body;
  const expense = await Expense.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { $set: { category, amount, description, tripId: tripId || null, receiptUrl: receiptUrl ?? undefined } },
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
