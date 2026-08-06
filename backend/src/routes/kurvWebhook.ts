// POST /api/billing/kurv/webhook
// Kurv posts here (the `response_url` given at payment-request creation) once
// a checkout is completed — including each time a recurring payment fires.
//
// Kurv's API docs don't document any signature scheme for this callback (no
// equivalent of Authorize.Net's X-ANET-Signature HMAC header), so the POSTed
// body is NOT trusted directly — anyone who learns this URL could forge a
// "success" payload. Instead we take only `transaction_id`/`payment_id` from
// the body and re-fetch the payment server-to-server via getPayment(), which
// is authenticated with our own secret key, and act on THAT response only.

import { Router, Request, Response } from 'express';
import express from 'express';
import User from '../models/User';
import Celebrity from '../models/Celebrity';
import PromoRedemption from '../models/PromoRedemption';
import { PLANS } from './billing';
import { getPayment } from '../services/kurv';

const router = Router();

// Kurv's docs describe the payload inconsistently (form-encoded per the intro,
// JSON per every example) — accept either.
router.use(express.urlencoded({ extended: true }));

router.post('/', async (req: Request, res: Response) => {
  try {
    const raw = req.body?.response;
    const payload = typeof raw === 'string' ? JSON.parse(raw) : (raw ?? req.body);
    const transactionId: string | undefined = payload?.transaction_id;
    const paymentId: string | undefined = payload?.payment_id;

    if (!transactionId && !paymentId) {
      res.status(400).json({ message: 'Missing transaction_id/payment_id.' });
      return;
    }

    const user = transactionId
      ? await User.findOne({ kurvTransactionId: String(transactionId) })
      : null;
    if (!user) {
      // Not one of ours (or already processed and the pending fields were
      // cleared) — acknowledge so Kurv doesn't retry indefinitely.
      res.json({ received: true });
      return;
    }

    if (!paymentId) {
      // transaction_id identifies the payment REQUEST, not the resulting
      // payment — GET /payments/{payment_id} needs the latter, and Kurv's own
      // sample payload always includes both, so treat a missing one as
      // unexpected rather than guessing.
      console.error('[kurv/webhook] payload missing payment_id', { transactionId });
      res.status(400).json({ message: 'Missing payment_id.' });
      return;
    }

    // Re-verify with Kurv directly rather than trusting the POST body.
    const payment = await getPayment(paymentId);

    if (payment.status !== 'success') {
      res.json({ received: true });
      return;
    }

    const plan = user.kurvPendingPlan;
    if (!plan) {
      // Already activated by an earlier call for this same transaction (e.g. a
      // recurring charge notification arriving after the first one cleared
      // the pending fields) — nothing left to do.
      res.json({ received: true });
      return;
    }

    await User.findByIdAndUpdate(user._id, {
      subscriptionStatus: 'active',
      subscriptionPlan: plan,
      subscriptionEnd: null,
      subscriptionSource: 'kurv',
      kurvPaymentId: payment.paymentId,
      $unset: { kurvPendingPlan: '', kurvPendingCelebrityId: '', kurvPendingAmountCents: '' },
    });

    if (user.kurvPendingCelebrityId) {
      const amountCharged = user.kurvPendingAmountCents ?? Math.round(payment.amount * 100);
      try {
        // Insert first — the unique (celebrityId, source, sourceRef) index makes
        // this the idempotency check, same pattern as the other providers.
        await PromoRedemption.create({
          celebrityId: user.kurvPendingCelebrityId,
          userId: user._id,
          plan,
          source: 'kurv',
          sourceRef: transactionId || payment.transactionId,
          discountAmount: Math.max(0, PLANS[plan].amount - amountCharged),
          amountCharged,
        });
        await Celebrity.findByIdAndUpdate(user.kurvPendingCelebrityId, { $inc: { redemptionCount: 1 } });
      } catch (err: any) {
        if (err.code !== 11000) throw err;
      }
    }

    res.json({ received: true });
  } catch (err: any) {
    console.error('[kurv/webhook]', err.message);
    res.status(500).json({ message: 'Webhook processing error.' });
  }
});

export default router;
