import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import Load from '../models/Load';

const router = Router();
router.use(protect);

router.get('/', async (req: AuthRequest, res: Response) => {
  const { status } = req.query;
  const filter: any = { userId: req.user._id };
  if (status) filter.status = status;
  const loads = await Load.find(filter).sort({ createdAt: -1 });
  res.json({ loads });
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  const load = await Load.findOne({ _id: req.params.id, userId: req.user._id });
  if (!load) { res.status(404).json({ message: 'Not found' }); return; }
  res.json({ load });
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const { loadNumber, broker, shipper, consignee, commodity, weight, miles, rate, ratePerMile, status, notes } = req.body;
  if (!broker?.name || !shipper?.name || !shipper?.city || !shipper?.state || !consignee?.name || !consignee?.city || !consignee?.state || rate == null) {
    res.status(400).json({ message: 'broker.name, shipper, consignee, and rate are required' }); return;
  }
  const load = await Load.create({
    userId: req.user._id, loadNumber, broker, shipper, consignee,
    commodity, weight, miles, rate, ratePerMile, status, notes,
  });
  res.status(201).json({ load });
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  const { loadNumber, broker, shipper, consignee, commodity, weight, miles, rate, ratePerMile, status, notes } = req.body;
  const load = await Load.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { $set: { loadNumber, broker, shipper, consignee, commodity, weight, miles, rate, ratePerMile, status, notes } },
    { new: true, runValidators: true }
  );
  if (!load) { res.status(404).json({ message: 'Not found' }); return; }
  res.json({ load });
});

router.patch('/:id/status', async (req: AuthRequest, res: Response) => {
  const { status } = req.body;
  const valid = ['booked', 'in_transit', 'delivered', 'invoiced', 'paid'];
  if (!valid.includes(status)) { res.status(400).json({ message: 'Invalid status' }); return; }
  const load = await Load.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { $set: { status } },
    { new: true }
  );
  if (!load) { res.status(404).json({ message: 'Not found' }); return; }
  res.json({ load });
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  await Load.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  res.json({ message: 'Deleted' });
});

export default router;
