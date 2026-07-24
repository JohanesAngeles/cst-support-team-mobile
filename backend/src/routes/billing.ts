import { Router, Response, Request } from 'express';
import Stripe from 'stripe';
import rateLimit from 'express-rate-limit';
import { protect, AuthRequest } from '../middleware/auth';
import User from '../models/User';
import CashAppPayment from '../models/CashAppPayment';
import { upload, uploadToCloudinary } from '../middleware/upload';
import { sendAdminCashAppSubmittedEmail } from '../utils/email';
import { sendPushToUser } from './notifications';

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

const PLANS: Record<string, { priceId: string; name: string; amount: number }> = {
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
  const { plan, successUrl, cancelUrl } = req.body;

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

  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [{ price: PLANS[plan].priceId, quantity: 1 }],
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { userId: String(user._id), plan },
  });

  res.json({ url: session.url, sessionId: session.id });
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
    if (userId) {
      await User.findByIdAndUpdate(userId, {
        subscriptionStatus: 'active',
        subscriptionPlan: plan,
        subscriptionEnd: null,
        subscriptionSource: 'stripe',
        stripeCustomerId: session.customer,
      });
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
  const { plan, referenceNumber, senderCashtag } = req.body;
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

    const screenshot = await uploadToCloudinary(req.file.buffer, `road-ready-cashapp/${req.user._id}`, req.file.mimetype);
    const amount = plan === 'annual' ? 100 : 10;

    const payment = await CashAppPayment.create({
      userId: req.user._id,
      plan,
      amount,
      senderCashtag: senderCashtag.trim(),
      referenceNumber: referenceNumber.trim(),
      screenshotUrl: screenshot.url,
    });

    await User.findByIdAndUpdate(req.user._id, {
      cashAppPending: true,
      cashAppPendingPlan: plan,
      cashAppPendingAt: new Date(),
    });
    res.json({ ok: true });

    // Notify admins by push and email so they don't have to manually check
    const partnerName = req.user.name ?? req.user.email;
    const planLabel   = plan === 'annual' ? 'Annual ($100.00)' : 'Monthly ($10.00)';
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
