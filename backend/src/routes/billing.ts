import { Router, Response, Request } from 'express';
import Stripe from 'stripe';
import { protect, AuthRequest } from '../middleware/auth';
import User from '../models/User';

const router = Router();

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
    name: 'CST Monthly',
    amount: 2999,
  },
  annual: {
    priceId: process.env.STRIPE_PRICE_ANNUAL ?? '',
    name: 'CST Annual',
    amount: 24999,
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

// Middleware to capture raw body for Stripe webhook verification
function express_raw_body(req: Request, _res: Response, next: () => void) {
  let data = '';
  req.setEncoding('utf8');
  req.on('data', (chunk) => { data += chunk; });
  req.on('end', () => { (req as any).rawBody = data; next(); });
}

export default router;
