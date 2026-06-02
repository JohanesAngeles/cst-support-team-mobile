import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import Invoice from '../models/Invoice';
import { sendInvoiceEmail } from '../utils/email';

const router = Router();
router.use(protect);

router.get('/', async (req: AuthRequest, res: Response) => {
  const invoices = await Invoice.find({ userId: req.user._id }).sort({ createdAt: -1 });
  res.json({ invoices });
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const { invoiceNumber, date, dueDate, billTo, services, subtotal, taxRate, taxAmount, total, status, loadRef, notes } = req.body;
  if (!invoiceNumber || !date || !dueDate || !billTo || !services || total == null) {
    res.status(400).json({ message: 'invoiceNumber, date, dueDate, billTo, services, and total are required' }); return;
  }
  const invoice = await Invoice.create({
    userId: req.user._id, invoiceNumber, date, dueDate, billTo, services,
    subtotal, taxRate: taxRate ?? 0, taxAmount: taxAmount ?? 0, total, status, loadRef, notes,
  });
  res.status(201).json({ invoice });
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  const invoice = await Invoice.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    req.body,
    { new: true }
  );
  if (!invoice) { res.status(404).json({ message: 'Not found' }); return; }
  res.json({ invoice });
});

router.patch('/:id/status', async (req: AuthRequest, res: Response) => {
  const { status } = req.body;
  const update: Record<string, string> = { status };
  if (status === 'paid') update.paidAt = new Date().toISOString().split('T')[0];
  const invoice = await Invoice.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    update,
    { new: true }
  );
  if (!invoice) { res.status(404).json({ message: 'Not found' }); return; }
  res.json({ invoice });
});

// Email invoice to billTo.email (or provided override)
router.post('/:id/email', async (req: AuthRequest, res: Response) => {
  const invoice = await Invoice.findOne({ _id: req.params.id, userId: req.user._id });
  if (!invoice) { res.status(404).json({ message: 'Not found' }); return; }

  const to: string = req.body.email || invoice.billTo.email;
  if (!to) { res.status(400).json({ message: 'No email address on file for this invoice' }); return; }

  try {
    await sendInvoiceEmail(to, invoice.toObject());
    // Auto-advance status from draft → sent
    if (invoice.status === 'draft') {
      await Invoice.findByIdAndUpdate(invoice._id, { status: 'sent' });
    }
    res.json({ message: `Invoice emailed to ${to}` });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to send email', detail: err.message });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  await Invoice.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  res.json({ message: 'Deleted' });
});

export default router;
