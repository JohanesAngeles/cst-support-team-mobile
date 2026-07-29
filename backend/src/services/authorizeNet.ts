// backend/src/services/authorizeNet.ts
// Thin wrapper around Authorize.Net's unified JSON REST API (CIM + ARB).
// Not using the official `authorizenet` npm SDK — it's a callback-style
// Java-to-JS port (APIContracts/APIControllers) that doesn't fit this
// codebase's async/await style, so we call the JSON API directly instead.
import crypto from 'crypto';

export const AUTHORIZENET_ENV: 'sandbox' | 'production' =
  process.env.AUTHORIZENET_ENV === 'production' ? 'production' : 'sandbox';

const API_URL = AUTHORIZENET_ENV === 'production'
  ? 'https://api.authorize.net/xml/v1/request.api'
  : 'https://apitest.authorize.net/xml/v1/request.api';

function getAuth() {
  const name = process.env.AUTHORIZENET_API_LOGIN_ID;
  const transactionKey = process.env.AUTHORIZENET_TRANSACTION_KEY;
  if (!name || !transactionKey) throw new Error('Authorize.Net not configured — set AUTHORIZENET_API_LOGIN_ID / AUTHORIZENET_TRANSACTION_KEY');
  return { name, transactionKey };
}

async function callApi(body: unknown): Promise<any> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  // Authorize.Net's JSON API prefixes the body with a UTF-8 BOM.
  const text = (await res.text()).replace(/^﻿/, '');
  const data = JSON.parse(text);
  const resultCode = data.messages?.resultCode;
  if (resultCode !== 'Ok') {
    const message = data.messages?.message?.[0]?.text || 'Authorize.Net request failed';
    const err: any = new Error(message);
    err.authorizeNetResponse = data;
    throw err;
  }
  return data;
}

interface CreateProfileArgs {
  email: string;
  opaqueDataDescriptor: string;
  opaqueDataValue: string;
}

// Creates a CIM customer profile + payment profile from an Accept.js opaque
// data nonce. Returns IDs used to charge this card later (ARB subscription).
export async function createCustomerProfileWithCard({ email, opaqueDataDescriptor, opaqueDataValue }: CreateProfileArgs) {
  const data = await callApi({
    createCustomerProfileRequest: {
      merchantAuthentication: getAuth(),
      profile: {
        email,
        paymentProfiles: {
          customerType: 'individual',
          payment: {
            opaqueData: {
              dataDescriptor: opaqueDataDescriptor,
              dataValue: opaqueDataValue,
            },
          },
        },
      },
    },
  });
  return {
    customerProfileId: data.customerProfileId as string,
    customerPaymentProfileId: data.customerPaymentProfileIdList?.[0] as string,
  };
}

interface CreateSubscriptionArgs {
  customerProfileId: string;
  customerPaymentProfileId: string;
  amount: number;
  billingCycle: 'monthly' | 'annual';
  startDate?: Date;
}

// Creates an open-ended ARB subscription that auto-charges the stored card
// every month or year until cancelled.
export async function createSubscription({ customerProfileId, customerPaymentProfileId, amount, billingCycle, startDate }: CreateSubscriptionArgs) {
  const interval = billingCycle === 'annual'
    ? { length: 1, unit: 'years' }
    : { length: 1, unit: 'months' };

  const data = await callApi({
    ARBCreateSubscriptionRequest: {
      merchantAuthentication: getAuth(),
      subscription: {
        name: `Road Ready — ${billingCycle === 'annual' ? 'Annual' : 'Monthly'}`,
        paymentSchedule: {
          interval,
          startDate: (startDate || new Date()).toISOString().slice(0, 10),
          totalOccurrences: 9999,
        },
        amount: amount.toFixed(2),
        profile: {
          customerProfileId,
          customerPaymentProfileId,
        },
      },
    },
  });
  return { subscriptionId: data.subscriptionId as string };
}

export async function cancelSubscription(subscriptionId: string): Promise<void> {
  await callApi({
    ARBCancelSubscriptionRequest: {
      merchantAuthentication: getAuth(),
      subscriptionId,
    },
  });
}

// Authorize.Net signs webhook payloads with HMAC-SHA512 over the raw request
// body, sent as `X-ANET-Signature: sha512=<hex>`.
export function verifyWebhookSignature(rawBody: Buffer, signatureHeader?: string): boolean {
  const signatureKey = process.env.AUTHORIZENET_SIGNATURE_KEY;
  if (!signatureKey || !signatureHeader) return false;
  const expected = crypto.createHmac('sha512', signatureKey).update(rawBody).digest('hex').toUpperCase();
  const provided = signatureHeader.replace(/^sha512=/i, '').toUpperCase();
  if (expected.length !== provided.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
}
