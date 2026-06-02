import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import DVIREntry from '../models/DVIREntry';
import MaintenanceRecord from '../models/MaintenanceRecord';

const router = Router();
router.use(protect);

router.get('/', async (req: AuthRequest, res: Response) => {
  const entries = await DVIREntry.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(50);
  res.json({ entries });
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const { type, date, odometer, truckId, items, driverSignature, remarks } = req.body;
  if (!type || !date || !items || !driverSignature) {
    res.status(400).json({ message: 'type, date, items, and driverSignature are required' }); return;
  }
  const defectsFound = items.some((i: { pass: boolean }) => !i.pass);
  const entry = await DVIREntry.create({ userId: req.user._id, type, date, odometer, truckId, items, defectsFound, driverSignature, remarks });

  // Auto-create maintenance work orders for each failed inspection item
  if (defectsFound) {
    const failedItems: { label: string; pass: boolean; notes?: string }[] = items.filter((i: { pass: boolean }) => !i.pass);
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 3); // due in 3 days by default
    await Promise.all(
      failedItems.map((item) =>
        MaintenanceRecord.create({
          userId: req.user._id,
          name: `DVIR Defect: ${item.label}`,
          icon: 'warning-outline',
          lastDate: date,
          nextDate: nextDate.toISOString().split('T')[0],
          lastMiles: odometer ?? 0,
          intervalMiles: 0,
        })
      )
    );
  }

  res.status(201).json({ entry });
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  await DVIREntry.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  res.json({ message: 'Deleted' });
});

export default router;
