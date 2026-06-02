import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import Referral from '../models/Referral';
import User from '../models/User';

const router = Router();
router.use(protect);

// GET my referral code + stats
router.get('/my', async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.user._id);
  if (!user) { res.status(404).json({ message: 'User not found' }); return; }

  if (!user.referralCode) {
    // Generate a unique code
    const code = `CST${user._id.toString().slice(-6).toUpperCase()}`;
    user.referralCode = code;
    await user.save();
  }

  const count = await Referral.countDocuments({ referrerId: req.user._id });
  res.json({ referralCode: user.referralCode, referralCount: count });
});

// POST — apply a referral code at registration (called after register)
router.post('/apply', async (req: AuthRequest, res: Response) => {
  const { code } = req.body;
  if (!code) { res.status(400).json({ message: 'code is required' }); return; }

  const referrer = await User.findOne({ referralCode: code });
  if (!referrer) { res.status(404).json({ message: 'Invalid referral code' }); return; }
  if (referrer._id.toString() === req.user._id.toString()) {
    res.status(400).json({ message: 'Cannot use your own referral code' }); return;
  }

  const alreadyApplied = await Referral.findOne({ referredUserId: req.user._id });
  if (alreadyApplied) { res.status(400).json({ message: 'Referral already applied' }); return; }

  await Referral.create({ referrerId: referrer._id, referredUserId: req.user._id, code });
  await User.findByIdAndUpdate(req.user._id, { referredBy: code });

  res.json({ message: 'Referral applied successfully', referrerName: referrer.name });
});

export default router;
