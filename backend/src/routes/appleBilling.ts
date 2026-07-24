import { Router, Response, Request } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import User from '../models/User';
import { verifyAppleTransaction, verifyAppleNotification, APPLE_PRODUCT_TO_PLAN } from '../utils/appleIap';

const router = Router();

// ── POST /api/billing/apple/verify ───────────────────────────────────────────
// Client sends the signed transaction it received from StoreKit after a
// purchase. We verify it against Apple before trusting it and activating
// the subscription.
router.post('/verify', protect, async (req: AuthRequest, res: Response) => {
  const { signedTransactionInfo } = req.body;
  if (!signedTransactionInfo) {
    res.status(400).json({ message: 'signedTransactionInfo is required.' });
    return;
  }

  try {
    const payload = await verifyAppleTransaction(signedTransactionInfo);
    const plan = payload.productId ? APPLE_PRODUCT_TO_PLAN[payload.productId] : undefined;

    if (!plan || !payload.originalTransactionId) {
      res.status(400).json({ message: 'Unrecognized product.' });
      return;
    }

    await User.findByIdAndUpdate(req.user._id, {
      subscriptionStatus: 'active',
      subscriptionPlan: plan,
      subscriptionEnd: payload.expiresDate ? new Date(payload.expiresDate) : null,
      subscriptionSource: 'apple',
      appleOriginalTransactionId: payload.originalTransactionId,
    });

    res.json({ ok: true, plan });
  } catch (err: any) {
    res.status(400).json({ message: 'Could not verify purchase with Apple.' });
  }
});

// ── POST /api/billing/apple/notifications ────────────────────────────────────
// App Store Server Notifications V2 webhook. Apple calls this directly
// (no auth) whenever a subscription renews, expires, fails to renew, or
// gets refunded, so we stay in sync without the app being open.
router.post('/notifications', async (req: Request, res: Response) => {
  const { signedPayload } = req.body;
  if (!signedPayload) {
    res.status(400).json({ message: 'signedPayload is required.' });
    return;
  }

  try {
    const decoded = await verifyAppleNotification(signedPayload);
    const signedTransactionInfo = decoded.data?.signedTransactionInfo;
    if (!signedTransactionInfo) {
      res.json({ received: true });
      return;
    }

    const transaction = await verifyAppleTransaction(signedTransactionInfo);
    const originalTransactionId = transaction.originalTransactionId;
    if (!originalTransactionId) {
      res.json({ received: true });
      return;
    }

    switch (decoded.notificationType) {
      case 'DID_RENEW': {
        const plan = transaction.productId ? APPLE_PRODUCT_TO_PLAN[transaction.productId] : undefined;
        await User.findOneAndUpdate({ appleOriginalTransactionId: originalTransactionId }, {
          subscriptionStatus: 'active',
          ...(plan ? { subscriptionPlan: plan } : {}),
          subscriptionEnd: transaction.expiresDate ? new Date(transaction.expiresDate) : null,
        });
        break;
      }
      case 'DID_FAIL_TO_RENEW':
        await User.findOneAndUpdate({ appleOriginalTransactionId: originalTransactionId }, {
          subscriptionStatus: 'past_due',
        });
        break;
      case 'EXPIRED':
      case 'GRACE_PERIOD_EXPIRED':
      case 'REFUND':
      case 'REVOKE':
        await User.findOneAndUpdate({ appleOriginalTransactionId: originalTransactionId }, {
          subscriptionStatus: 'cancelled',
          subscriptionEnd: transaction.expiresDate ? new Date(transaction.expiresDate) : new Date(),
        });
        break;
      default:
        break;
    }

    res.json({ received: true });
  } catch (err: any) {
    res.status(400).json({ message: 'Could not verify notification.' });
  }
});

export default router;
