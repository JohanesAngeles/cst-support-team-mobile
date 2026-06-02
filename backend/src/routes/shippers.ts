import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import ShipperReceiver from '../models/ShipperReceiver';

const router = Router();
router.use(protect);

router.get('/', async (req: AuthRequest, res: Response) => {
  const { type } = req.query;
  const query: Record<string, unknown> = { userId: req.user._id };
  if (type) query.type = type;
  const shippers = await ShipperReceiver.find(query).sort({ isFavorite: -1, name: 1 });
  res.json({ shippers });
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const { name, type, address, city, state, phone, contact, hours, appointmentRequired, dockInfo, notes } = req.body;
  if (!name || !type || !address || !city || !state) {
    res.status(400).json({ message: 'name, type, address, city, and state are required' }); return;
  }
  const shipper = await ShipperReceiver.create({
    userId: req.user._id, name, type, address, city, state,
    phone, contact, hours, appointmentRequired, dockInfo, notes,
  });
  res.status(201).json({ shipper });
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  const shipper = await ShipperReceiver.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    req.body,
    { new: true }
  );
  if (!shipper) { res.status(404).json({ message: 'Not found' }); return; }
  res.json({ shipper });
});

router.patch('/:id/favorite', async (req: AuthRequest, res: Response) => {
  const shipper = await ShipperReceiver.findOne({ _id: req.params.id, userId: req.user._id });
  if (!shipper) { res.status(404).json({ message: 'Not found' }); return; }
  shipper.isFavorite = !shipper.isFavorite;
  await shipper.save();
  res.json({ shipper });
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  await ShipperReceiver.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  res.json({ message: 'Deleted' });
});

export default router;
