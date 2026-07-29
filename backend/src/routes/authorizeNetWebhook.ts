// POST /api/billing/authorizenet/webhook
// Authorize.Net sends recurring-billing events here (successful ARB charges,
// subscription suspended/terminated). Must be mounted with express.raw()
// BEFORE app.use(express.json()) in app.ts — express.json() has no `verify`
// callback here, so by the time a request reaches a route mounted after it
// the raw bytes needed for signature verification are already gone.

import { Router, Request, Response } from 'express';
import User from '../models/User';
import { verifyWebhookSignature } from '../services/authorizeNet';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-anet-signature'] as string | undefined;
    const raw = req.body as Buffer;
    if (!verifyWebhookSignature(raw, signature)) {
      res.status(401).json({ message: 'Invalid signature.' });
      return;
    }

    const event = JSON.parse(raw.toString('utf8'));
    const eventType = event.eventType;
    const payload = event.payload || {};

    if (eventType === 'net.authorize.payment.authcapture.created') {
      const subscriptionId = payload.subscription?.id || payload.subscriptionId;
      if (subscriptionId) {
        const user = await User.findOne({ authorizeNetSubscriptionId: String(subscriptionId) });
        if (user) {
          await User.findByIdAndUpdate(user._id, {
            subscriptionStatus: 'active',
            subscriptionEnd: null,
          });
        }
      }
    }

    if (eventType === 'net.authorize.customer.subscription.suspended' || eventType === 'net.authorize.customer.subscription.terminated') {
      const subscriptionId = payload.id || payload.subscriptionId;
      if (subscriptionId) {
        await User.findOneAndUpdate(
          { authorizeNetSubscriptionId: String(subscriptionId) },
          { subscriptionStatus: 'past_due' }
        );
      }
    }

    res.json({ received: true });
  } catch (err: any) {
    console.error('[authorizenet/webhook]', err.message);
    res.status(500).json({ message: 'Webhook processing error.' });
  }
});

export default router;
