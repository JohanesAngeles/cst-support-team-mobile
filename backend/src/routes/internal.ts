import { Router, Request, Response } from 'express';
import { internalOnly } from '../middleware/internalAuth';
import Celebrity from '../models/Celebrity';
import PromoRedemption from '../models/PromoRedemption';

const router = Router();

router.use(internalOnly);

// ── GET /api/internal/celebrities ───────────────────────────────────────────
router.get('/celebrities', async (_req: Request, res: Response) => {
  try {
    const celebrities = await Celebrity.find().select('-password').sort({ createdAt: -1 });
    res.json({ celebrities });
  } catch {
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── POST /api/internal/celebrities ──────────────────────────────────────────
router.post('/celebrities', async (req: Request, res: Response) => {
  try {
    const {
      name, email, password, code, discountType, discountValue,
      plans, maxRedemptions, expiresAt, createdByLabel,
    } = req.body;

    if (!name || !email || !password || !code || !discountType || discountValue == null) {
      res.status(400).json({ message: 'name, email, password, code, discountType, and discountValue are required.' });
      return;
    }
    if (!['percent', 'fixed'].includes(discountType)) {
      res.status(400).json({ message: 'discountType must be "percent" or "fixed".' });
      return;
    }
    if (String(password).length < 8) {
      res.status(400).json({ message: 'Password must be at least 8 characters.' });
      return;
    }

    const celebrity = await Celebrity.create({
      name, email, password, code, discountType, discountValue,
      plans: Array.isArray(plans) && plans.length ? plans : ['monthly', 'annual'],
      maxRedemptions: maxRedemptions ?? null,
      expiresAt: expiresAt ?? null,
      createdByLabel,
    });

    const { password: _pw, ...safe } = celebrity.toObject();
    res.status(201).json({ celebrity: safe });
  } catch (err: any) {
    if (err.code === 11000) {
      res.status(400).json({ message: 'A celebrity with that email or code already exists.' });
      return;
    }
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── PATCH /api/internal/celebrities/:id ─────────────────────────────────────
router.patch('/celebrities/:id', async (req: Request, res: Response) => {
  try {
    const update = { ...req.body };
    delete update.redemptionCount; // never settable directly — only via redemption logging
    delete update.stripeCouponId;  // system-managed

    const celebrity = await Celebrity.findById(req.params.id);
    if (!celebrity) { res.status(404).json({ message: 'Celebrity not found.' }); return; }

    Object.assign(celebrity, update);
    // If the discount terms changed, drop the cached Stripe coupon so it's regenerated.
    if (update.discountType || update.discountValue != null) {
      celebrity.stripeCouponId = null;
    }
    await celebrity.save();

    const { password: _pw, ...safe } = celebrity.toObject();
    res.json({ celebrity: safe });
  } catch (err: any) {
    if (err.code === 11000) {
      res.status(400).json({ message: 'A celebrity with that email or code already exists.' });
      return;
    }
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── DELETE /api/internal/celebrities/:id ────────────────────────────────────
router.delete('/celebrities/:id', async (req: Request, res: Response) => {
  try {
    await Celebrity.findByIdAndDelete(req.params.id);
    res.json({ message: 'Celebrity deleted.' });
  } catch {
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── GET /api/internal/celebrities/:id/redemptions ───────────────────────────
// Full redemption detail (including who redeemed) — admin-only view, proxied
// through ca_website's Admin dashboard. Not exposed to the celebrity's own portal.
router.get('/celebrities/:id/redemptions', async (req: Request, res: Response) => {
  try {
    const redemptions = await PromoRedemption.find({ celebrityId: req.params.id })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });
    res.json({ redemptions });
  } catch {
    res.status(500).json({ message: 'Server error.' });
  }
});

export default router;
