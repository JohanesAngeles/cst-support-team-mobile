import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import PartnerApplication from '../models/PartnerApplication';

const router = Router();

const applyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { message: 'Too many applications from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/partner-applications — public, no auth required
router.post('/', applyLimiter, async (req: Request, res: Response) => {
  try {
    const {
      businessName, category, contactName,
      email, phone, city, state, website, description,
    } = req.body;

    if (!businessName || !category || !contactName || !email || !phone || !city || !state) {
      return res.status(400).json({ message: 'Please fill in all required fields.' });
    }

    const existing = await PartnerApplication.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ message: 'An application with this email has already been submitted.' });
    }

    const application = await PartnerApplication.create({
      businessName, category, contactName,
      email, phone, city, state, website, description,
    });

    res.status(201).json({ message: 'Application submitted successfully.', id: application._id });
  } catch (err: any) {
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
});

// GET /api/partner-applications — admin use (no frontend yet, for future admin panel)
router.get('/', async (_req: Request, res: Response) => {
  try {
    const apps = await PartnerApplication.find().sort({ createdAt: -1 });
    res.json(apps);
  } catch {
    res.status(500).json({ message: 'Server error.' });
  }
});

export default router;
