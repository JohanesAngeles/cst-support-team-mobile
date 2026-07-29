import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import User from '../models/User';
import Celebrity from '../models/Celebrity';
import PromoRedemption from '../models/PromoRedemption';
import { PLANS } from './billing';
import { findValidCelebrityCode, computeDiscountedAmount } from '../utils/promoCodes';
import {
  AUTHORIZENET_ENV,
  createCustomerProfileWithCard,
  createSubscription,
} from '../services/authorizeNet';

const router = Router();

// GET /api/billing/authorizenet/config — values Accept.js needs client-side.
router.get('/config', protect, (_req: AuthRequest, res: Response) => {
  res.json({
    apiLoginId: process.env.AUTHORIZENET_API_LOGIN_ID ?? null,
    clientKey:  process.env.AUTHORIZENET_CLIENT_KEY ?? null,
    env: AUTHORIZENET_ENV,
  });
});

// POST /api/billing/authorizenet/subscribe — Partner pays by card.
// Creates a CIM profile + ARB subscription and activates immediately — the
// gateway itself confirms the charge, so unlike Cash App this needs no manual
// admin verification step.
router.post('/subscribe', protect, async (req: AuthRequest, res: Response) => {
  const { plan, opaqueDataDescriptor, opaqueDataValue, promoCode } = req.body;

  if (!PLANS[plan]) { res.status(400).json({ message: 'Invalid plan. Use "monthly" or "annual".' }); return; }
  if (!opaqueDataDescriptor || !opaqueDataValue) { res.status(400).json({ message: 'Card details are missing. Please try again.' }); return; }

  const user = await User.findById(req.user._id);
  if (!user) { res.status(404).json({ message: 'User not found' }); return; }

  try {
    let celebrity = null;
    if (promoCode) {
      celebrity = await findValidCelebrityCode(promoCode, plan);
      if (!celebrity) { res.status(400).json({ message: 'Invalid or expired promo code.' }); return; }
    }
    const amountCents = celebrity ? computeDiscountedAmount(PLANS[plan].amount, celebrity) : PLANS[plan].amount;
    const amount = amountCents / 100;

    const { customerProfileId, customerPaymentProfileId } = await createCustomerProfileWithCard({
      email: user.email,
      opaqueDataDescriptor,
      opaqueDataValue,
    });
    const { subscriptionId } = await createSubscription({
      customerProfileId,
      customerPaymentProfileId,
      amount,
      billingCycle: plan,
    });

    await User.findByIdAndUpdate(user._id, {
      subscriptionStatus: 'active',
      subscriptionPlan: plan,
      subscriptionEnd: null,
      subscriptionSource: 'authorizenet',
      authorizeNetCustomerProfileId: customerProfileId,
      authorizeNetPaymentProfileId: customerPaymentProfileId,
      authorizeNetSubscriptionId: subscriptionId,
    });

    if (celebrity) {
      try {
        // Insert first — the unique (celebrityId, source, sourceRef) index makes this
        // the idempotency check, same pattern as the Stripe webhook.
        await PromoRedemption.create({
          celebrityId: celebrity._id,
          userId: user._id,
          plan,
          source: 'authorizenet',
          sourceRef: subscriptionId,
          discountAmount: PLANS[plan].amount - amountCents,
          amountCharged: amountCents,
        });
        const updated = await Celebrity.findOneAndUpdate(
          { _id: celebrity._id, ...(celebrity.maxRedemptions != null ? { $expr: { $lt: ['$redemptionCount', celebrity.maxRedemptions] } } : {}) },
          { $inc: { redemptionCount: 1 } }
        );
        void updated;
      } catch (err: any) {
        if (err.code !== 11000) throw err;
      }
    }

    res.json({ ok: true });
  } catch (err: any) {
    console.error('[authorizenet/subscribe]', err.message);
    res.status(500).json({ message: err.message || 'Payment could not be processed. Please check your card details and try again.' });
  }
});

export default router;
