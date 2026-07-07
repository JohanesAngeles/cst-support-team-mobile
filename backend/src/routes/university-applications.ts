import { Router, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { protect, AuthRequest } from '../middleware/auth';
import UniversityApplication from '../models/UniversityApplication';

const router = Router();

const applyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { message: 'Too many applications from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/university-applications — must be logged in as a driver
router.post('/', protect, applyLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const { truckType, yearsDriving, cdlClass, phone, goals } = req.body;

    if (!goals || !String(goals).trim()) {
      res.status(400).json({ message: 'Tell us what you\'re hoping to get out of the program.' });
      return;
    }

    const existing = await UniversityApplication.findOne({
      userId: req.user._id,
      status: { $in: ['pending', 'approved'] },
    });
    if (existing) {
      res.status(409).json({ message: 'You already have an application on file.' });
      return;
    }

    const application = await UniversityApplication.create({
      userId: req.user._id,
      name: req.user.name,
      email: req.user.email,
      phone: phone || req.user.phone,
      truckType,
      yearsDriving,
      cdlClass,
      goals,
    });

    res.status(201).json({ message: 'Application submitted successfully.', application });
  } catch {
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
});

// GET /api/university-applications/me — the current user's own latest application, if any
router.get('/me', protect, async (req: AuthRequest, res: Response) => {
  try {
    const application = await UniversityApplication.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({ application });
  } catch {
    res.status(500).json({ message: 'Server error.' });
  }
});

export default router;
