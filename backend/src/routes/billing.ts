import { Router, Response, Request } from 'express';
import Stripe from 'stripe';
import rateLimit from 'express-rate-limit';
import { protect, AuthRequest } from '../middleware/auth';
import User from '../models/User';
import CashAppPayment from '../models/CashAppPayment';
import Celebrity from '../models/Celebrity';
import PromoRedemption from '../models/PromoRedemption';
import { upload, uploadToCloudinary } from '../middleware/upload';
import { sendAdminCashAppSubmittedEmail } from '../utils/email';
import { sendPushToUser } from './notifications';
import { findValidCelebrityCode, computeDiscountedAmount, getOrCreateStripeCoupon, incrementRedemption } from '../utils/promoCodes';

const router = Router();

const cashAppLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { message: 'Too many submissions. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

let _stripe: InstanceType<typeof Stripe> | null = null;
function getStripe(): InstanceType<typeof Stripe> {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('Stripe not configured — set STRIPE_SECRET_KEY');
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-04-22.dahlia' });
  }
  return _stripe;
}

export const PLANS: Record<string, { priceId: string; name: string; amount: number }> = {
  monthly: {
    priceId: process.env.STRIPE_PRICE_MONTHLY ?? '',
    name: 'Road Ready Monthly',
    amount: 1000,
  },
  annual: {
    priceId: process.env.STRIPE_PRICE_ANNUAL ?? '',
    name: 'Road Ready Annual',
    amount: 10000,
  },
};

// Get current subscription status
router.get('/status', protect, async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.user._id).select('subscriptionStatus subscriptionPlan subscriptionEnd stripeCustomerId');
  if (!user) { res.status(404).json({ message: 'User not found' }); return; }

  res.json({
    status: (user as any).subscriptionStatus ?? 'free',
    plan: (user as any).subscriptionPlan ?? null,
    expiresAt: (user as any).subscriptionEnd ?? null,
    isActive: (user as any).subscriptionStatus === 'active',
  });
});

// Create Stripe Checkout session
router.post('/checkout', protect, async (req: AuthRequest, res: Response) => {
  const { plan, successUrl, cancelUrl, promoCode } = req.body;

  if (!PLANS[plan]) { res.status(400).json({ message: 'Invalid plan. Use "monthly" or "annual".' }); return; }
  if (!successUrl || !cancelUrl) { res.status(400).json({ message: 'successUrl and cancelUrl are required' }); return; }

  const user = await User.findById(req.user._id);
  if (!user) { res.status(404).json({ message: 'User not found' }); return; }

  let customerId = (user as any).stripeCustomerId as string | undefined;

  if (!customerId) {
    const customer = await getStripe().customers.create({ email: user.email, name: user.name, metadata: { userId: String(user._id) } });
    customerId = customer.id;
    await User.findByIdAndUpdate(user._id, { stripeCustomerId: customerId });
  }

  let discounts: { coupon: string }[] | undefined;
  let appliedCode: string | undefined;
  if (promoCode) {
    const celebrity = await findValidCelebrityCode(promoCode, plan);
    if (!celebrity) { res.status(400).json({ message: 'Invalid or expired promo code.' }); return; }
    const couponId = await getOrCreateStripeCoupon(celebrity);
    discounts = [{ coupon: couponId }];
    appliedCode = celebrity.code;
  }

  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [{ price: PLANS[plan].priceId, quantity: 1 }],
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    ...(discounts ? { discounts } : {}),
    metadata: { userId: String(user._id), plan, ...(appliedCode ? { promoCode: appliedCode } : {}) },
  });

  res.json({ url: session.url, sessionId: session.id });
});

// Preview a celebrity promo code's discount before checkout/cashapp submission
const validatePromoLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: 'Too many attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/validate-promo', protect, validatePromoLimiter, async (req: AuthRequest, res: Response) => {
  const { code, plan } = req.body;
  if (!code) { res.status(400).json({ message: 'code is required.' }); return; }
  // plan is optional — a preview shown before the user has picked monthly/annual
  // (e.g. the mobile app's "have a code?" field) can't know the plan yet. If a
  // plan IS given, it must be a real one so we can compute a discounted amount.
  if (plan && !PLANS[plan]) { res.status(400).json({ message: 'Invalid plan.' }); return; }

  const celebrity = await findValidCelebrityCode(code, plan);
  if (!celebrity) { res.status(404).json({ valid: false, message: 'Invalid or expired promo code.' }); return; }

  res.json({
    valid: true,
    label: celebrity.name,
    discountType: celebrity.discountType,
    discountValue: celebrity.discountValue,
    plans: celebrity.plans,
    discountedAmount: plan ? computeDiscountedAmount(PLANS[plan].amount, celebrity) : null,
  });
});

// Create customer portal session (manage/cancel subscription)
router.post('/portal', protect, async (req: AuthRequest, res: Response) => {
  const { returnUrl } = req.body;
  const user = await User.findById(req.user._id);
  const customerId = (user as any)?.stripeCustomerId as string | undefined;

  if (!customerId) { res.status(400).json({ message: 'No billing account found. Subscribe first.' }); return; }

  const session = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl ?? 'cst://profile',
  });

  res.json({ url: session.url });
});

// Stripe webhook — updates subscription status in DB
router.post('/webhook', express_raw_body, async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? '';

  let event: ReturnType<InstanceType<typeof Stripe>['webhooks']['constructEvent']>;
  try {
    event = getStripe().webhooks.constructEvent((req as any).rawBody, sig, webhookSecret);
  } catch (err: any) {
    res.status(400).json({ message: `Webhook error: ${err.message}` });
    return;
  }

  const session = event.data.object as any;

  if (event.type === 'checkout.session.completed') {
    const userId = session.metadata?.userId;
    const plan = session.metadata?.plan;
    const promoCode = session.metadata?.promoCode;
    if (userId) {
      await User.findByIdAndUpdate(userId, {
        subscriptionStatus: 'active',
        subscriptionPlan: plan,
        subscriptionEnd: null,
        subscriptionSource: 'stripe',
        stripeCustomerId: session.customer,
      });
    }

    if (promoCode && userId) {
      const celebrity = await Celebrity.findOne({ code: promoCode });
      if (celebrity) {
        try {
          // Insert first — the unique (celebrityId, source, sourceRef) index makes this
          // the idempotency check. Only increment the redemption count on first success,
          // so a Stripe webhook retry for the same session can't double-count.
          await PromoRedemption.create({
            celebrityId: celebrity._id,
            userId,
            plan,
            source: 'stripe',
            sourceRef: session.id,
            discountAmount: session.total_details?.amount_discount ?? 0,
            amountCharged: session.amount_total ?? 0,
          });
          await incrementRedemption(String(celebrity._id));
        } catch (err: any) {
          if (err.code !== 11000) throw err;
        }
      }
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const customerId = session.customer as string;
    await User.findOneAndUpdate({ stripeCustomerId: customerId }, {
      subscriptionStatus: 'cancelled',
      subscriptionEnd: new Date(session.current_period_end * 1000),
    });
  }

  if (event.type === 'invoice.payment_failed') {
    const customerId = session.customer as string;
    await User.findOneAndUpdate({ stripeCustomerId: customerId }, { subscriptionStatus: 'past_due' });
  }

  res.json({ received: true });
});

// ── POST /api/billing/cashapp-request ────────────────────────────────────────
// Partner submits "I've sent Cash App payment" — admin will manually verify
// against their own Cash App activity feed before activating.
router.post('/cashapp-request', protect, cashAppLimiter, upload.single('screenshot'), async (req: AuthRequest, res: Response) => {
  const { plan, referenceNumber, senderCashtag, promoCode } = req.body;
  if (!['monthly', 'annual'].includes(plan)) {
    res.status(400).json({ message: 'Invalid plan.' }); return;
  }
  if (!referenceNumber || !String(referenceNumber).trim()) {
    res.status(400).json({ message: 'Cash App reference number is required.' }); return;
  }
  if (!senderCashtag || !String(senderCashtag).trim()) {
    res.status(400).json({ message: 'Your Cash App $cashtag is required so we can match your payment.' }); return;
  }
  if (!req.file) {
    res.status(400).json({ message: 'A screenshot of your Cash App payment confirmation is required.' }); return;
  }

  try {
    const dupe = await CashAppPayment.findOne({ referenceNumber: referenceNumber.trim() });
    if (dupe) {
      res.status(400).json({ message: 'This Cash App reference number has already been submitted. Each payment can only be claimed once.' });
      return;
    }

    let celebrity = null;
    if (promoCode) {
      celebrity = await findValidCelebrityCode(promoCode, plan);
      if (!celebrity) { res.status(400).json({ message: 'Invalid or expired promo code.' }); return; }
    }

    const screenshot = await uploadToCloudinary(req.file.buffer, `road-ready-cashapp/${req.user._id}`, req.file.mimetype);
    // PLANS[plan].amount is cents; CashAppPayment.amount below is plain dollars — convert once here.
    const amount = celebrity
      ? computeDiscountedAmount(PLANS[plan].amount, celebrity) / 100
      : PLANS[plan].amount / 100;

    const payment = await CashAppPayment.create({
      userId: req.user._id,
      plan,
      amount,
      senderCashtag: senderCashtag.trim(),
      referenceNumber: referenceNumber.trim(),
      screenshotUrl: screenshot.url,
      promoCode: celebrity?.code,
    });

    await User.findByIdAndUpdate(req.user._id, {
      cashAppPending: true,
      cashAppPendingPlan: plan,
      cashAppPendingAt: new Date(),
    });
    res.json({ ok: true });

    // Notify admins by push and email so they don't have to manually check
    const partnerName = req.user.name ?? req.user.email;
    const planLabel   = `${plan === 'annual' ? 'Annual' : 'Monthly'} ($${amount.toFixed(2)})`;
    const admins = await User.find({ role: 'admin' }).select('_id');
    await Promise.all(
      admins.map(a =>
        sendPushToUser(
          String(a._id),
          '💵 Cash App Payment Received',
          `${partnerName} submitted a ${planLabel} payment. Open the Cash App tab to approve.`,
        )
      )
    );
    await sendAdminCashAppSubmittedEmail({
      partnerName,
      partnerEmail: req.user.email,
      plan,
      amount,
      referenceNumber: referenceNumber.trim(),
      senderCashtag: senderCashtag.trim(),
      screenshotUrl: screenshot.url,
      paymentId: String(payment._id),
    }).catch(err => console.error('[cashapp-admin-email]', err));
  } catch (err: any) {
    if (err.code === 11000) {
      res.status(400).json({ message: 'This Cash App reference number has already been submitted. Each payment can only be claimed once.' });
      return;
    }
    res.status(500).json({ message: 'Server error.' });
  }
});

// Middleware to capture raw body for Stripe webhook verification
function express_raw_body(req: Request, _res: Response, next: () => void) {
  let data = '';
  req.setEncoding('utf8');
  req.on('data', (chunk) => { data += chunk; });
  req.on('end', () => { (req as any).rawBody = data; next(); });
}

export default router;
