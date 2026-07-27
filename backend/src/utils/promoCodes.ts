import Stripe from 'stripe';
import Celebrity, { ICelebrity } from '../models/Celebrity';

let _stripe: InstanceType<typeof Stripe> | null = null;
function getStripe(): InstanceType<typeof Stripe> {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('Stripe not configured — set STRIPE_SECRET_KEY');
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-04-22.dahlia' });
  }
  return _stripe;
}

// A code is redeemable only if it's active, not expired, applies to the requested
// plan, and (when capped) hasn't hit its max redemptions yet. `plan` is optional
// so callers previewing a code before a plan has been chosen (e.g. the mobile
// app's "have a code?" field, shown before the monthly/annual buttons) don't get
// a false "invalid code" for a code that's actually only scoped to one plan —
// the actual plan is always enforced at checkout/cashapp-request time, where a
// plan is required.
export async function findValidCelebrityCode(code: string, plan?: 'monthly' | 'annual'): Promise<ICelebrity | null> {
  if (!code || !String(code).trim()) return null;
  const celebrity = await Celebrity.findOne({ code: String(code).trim().toUpperCase() });
  if (!celebrity) return null;
  if (!celebrity.active) return null;
  if (celebrity.expiresAt && celebrity.expiresAt.getTime() < Date.now()) return null;
  if (plan && !celebrity.plans.includes(plan)) return null;
  if (celebrity.maxRedemptions != null && celebrity.redemptionCount >= celebrity.maxRedemptions) return null;
  return celebrity;
}

export function computeDiscountedAmount(baseAmountCents: number, celebrity: ICelebrity): number {
  const discount = celebrity.discountType === 'percent'
    ? Math.round(baseAmountCents * (celebrity.discountValue / 100))
    : celebrity.discountValue;
  return Math.max(0, baseAmountCents - discount);
}

export async function getOrCreateStripeCoupon(celebrity: ICelebrity): Promise<string> {
  if (celebrity.stripeCouponId) return celebrity.stripeCouponId;

  const stripe = getStripe();
  const coupon = await stripe.coupons.create(
    celebrity.discountType === 'percent'
      ? { percent_off: celebrity.discountValue, duration: 'once', name: `Celebrity: ${celebrity.name}` }
      : { amount_off: celebrity.discountValue, currency: 'usd', duration: 'once', name: `Celebrity: ${celebrity.name}` }
  );

  celebrity.stripeCouponId = coupon.id;
  await celebrity.save();
  return coupon.id;
}

// Atomic so two concurrent redemptions can't both slip in under a maxRedemptions cap.
export async function incrementRedemption(celebrityId: string): Promise<boolean> {
  const filter: Record<string, unknown> = { _id: celebrityId };
  const celebrity = await Celebrity.findById(celebrityId).select('maxRedemptions');
  if (celebrity?.maxRedemptions != null) {
    filter.$expr = { $lt: ['$redemptionCount', celebrity.maxRedemptions] };
  }
  const updated = await Celebrity.findOneAndUpdate(filter, { $inc: { redemptionCount: 1 } });
  return !!updated;
}
