import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import SupportTicket from '../models/SupportTicket';

const router = Router();
router.use(protect);

const adminOnly = (req: AuthRequest, res: Response, next: Function) => {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ message: 'Admin access required.' });
    return;
  }
  next();
};

// Submit a new support request
router.post('/', async (req: AuthRequest, res: Response) => {
  const { subject, message } = req.body as { subject?: string; message?: string };
  if (!subject?.trim()) { res.status(400).json({ message: 'Subject is required' }); return; }
  if (!message?.trim()) { res.status(400).json({ message: 'Message is required' }); return; }

  const ticket = await SupportTicket.create({
    userId: req.user._id,
    userName: req.user.name,
    userEmail: req.user.email,
    subject: subject.trim(),
    message: message.trim(),
  });

  res.status(201).json({ ticket });
});

// The current user's own tickets, so they can see status/replies
router.get('/mine', async (req: AuthRequest, res: Response) => {
  const tickets = await SupportTicket.find({ userId: req.user._id }).sort({ createdAt: -1 });
  res.json({ tickets });
});

// Admin inbox
router.get('/', adminOnly, async (req: AuthRequest, res: Response) => {
  const { status } = req.query;
  const query: Record<string, unknown> = {};
  if (status) query.status = status;
  const tickets = await SupportTicket.find(query).sort({ createdAt: -1 }).limit(200);
  res.json({ tickets });
});

// Admin reply / resolve
router.put('/:id', adminOnly, async (req: AuthRequest, res: Response) => {
  const { status, adminReply } = req.body as { status?: 'open' | 'resolved'; adminReply?: string };
  const ticket = await SupportTicket.findById(req.params.id);
  if (!ticket) { res.status(404).json({ message: 'Ticket not found' }); return; }

  if (adminReply?.trim()) {
    ticket.adminReply = adminReply.trim();
    ticket.repliedAt = new Date();
  }
  if (status) ticket.status = status;
  await ticket.save();

  res.json({ ticket });
});

export default router;
