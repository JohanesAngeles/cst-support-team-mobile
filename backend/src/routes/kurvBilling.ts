import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import User from '../models/User';
import { PLANS } from './billing';
import { findValidCelebrityCode, computeDiscountedAmount } from '../utils/promoCodes';
import { createPaymentRequest, KurvPaymentFrequency } from '../services/kurv';

const router = Router();

// POST /api/billing/kurv/subscribe — creates a Kurv hosted checkout link.
// Unlike Authorize.Net, this does NOT activate the subscription — Kurv hosts
// the card form itself, so the customer still has to complete checkout at the
// returned url. Activation happens in kurvWebhook.ts once Kurv confirms payment.
router.post('/subscribe', protect, async (req: AuthRequest, res: Response) => {
  const { plan, successUrl, cancelUrl, promoCode } = req.body;

  if (!PLANS[plan]) { res.status(400).json({ message: 'Invalid plan. Use "monthly" or "annual".' }); return; }

  const webhookUrl = process.env.KURV_WEBHOOK_URL;
  if (!webhookUrl) { res.status(500).json({ message: 'Kurv is not fully configured.' }); return; }

  const user = await User.findById(req.user._id);
  if (!user) { res.status(404).json({ message: 'User not found' }); return; }

  try {
    let celebrity = null;
    if (promoCode) {
      celebrity = await findValidCelebrityCode(promoCode, plan);
      if (!celebrity) { res.status(400).json({ message: 'Invalid or expired promo code.' }); return; }
    }
    const amountCents = celebrity ? computeDiscountedAmount(PLANS[plan].amount, celebrity) : PLANS[plan].amount;

    const [firstName, ...rest] = (user.name || 'Driver').trim().split(/\s+/);
    const paymentFrequency: KurvPaymentFrequency = plan === 'annual' ? 'YEARLY' : 'MONTHLY';

    const { transactionId, shortUrl, longUrl } = await createPaymentRequest({
      email: user.email,
      firstName,
      lastName: rest.join(' '),
      amount: amountCents / 100,
      referenceNumber: `RR-${plan}-${user._id}`,
      redirectUrl: successUrl || 'cst://profile',
      cancelUrl: cancelUrl || successUrl || 'cst://profile',
      responseUrl: webhookUrl,
      paymentFrequency,
    });

    // Not active yet — just remember this request so the webhook can find its
    // way back to this user and apply the right plan/promo once payment lands.
    await User.findByIdAndUpdate(user._id, {
      kurvTransactionId: transactionId,
      kurvPendingPlan: plan,
      kurvPendingCelebrityId: celebrity ? String(celebrity._id) : undefined,
      kurvPendingAmountCents: amountCents,
    });

    res.json({ url: longUrl || shortUrl, transactionId });
  } catch (err: any) {
    console.error('[kurv/subscribe]', err.message);
    res.status(500).json({ message: err.message || 'Could not start checkout. Please try again.' });
  }
});

export default router;
