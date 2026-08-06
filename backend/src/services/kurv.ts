// backend/src/services/kurv.ts
// Thin wrapper around the Kurv REST API (https://kurv.app). Unlike Authorize.Net,
// Kurv hosts the entire checkout: we create a "payment request" and hand the
// customer a hosted URL (short_url/long_url) — no card data ever touches this
// backend. Recurring billing is expressed as a single payment request with a
// `payment_frequency` other than ONE-TIME; Kurv handles the recurring charges
// on their end and reports each result via the `response_url` webhook.
//
// Kurv's docs don't document a webhook signature scheme (unlike Authorize.Net's
// HMAC X-ANET-Signature header), so the webhook handler in kurvWebhook.ts does
// NOT trust the POSTed payload directly — it re-fetches the payment by ID from
// this service (authenticated with our own secret key) and only acts on that
// server-to-server response.

export const KURV_ENV: 'sandbox' | 'live' = process.env.KURV_ENV === 'live' ? 'live' : 'sandbox';

// Confirmed from every runnable example in Kurv's docs for sandbox. Kurv's docs
// never gave a concrete example for the production base URL (only a prose
// mention of "https://live.kurv.app"), so — rather than guess — production
// requires KURV_API_BASE_LIVE to be set explicitly before going live.
const API_BASE = KURV_ENV === 'live'
  ? requireLiveApiBase()
  : (process.env.KURV_API_BASE ?? 'https://api-sandbox.kurv.app');

function requireLiveApiBase(): string {
  const base = process.env.KURV_API_BASE_LIVE;
  if (!base) {
    throw new Error(
      'KURV_ENV=live but KURV_API_BASE_LIVE is not set. Confirm the real production base URL ' +
      'in the Kurv dashboard before setting this — it was not documented anywhere in the API reference.'
    );
  }
  return base;
}

function getSecretKey(): string {
  const key = process.env.KURV_SECRET_KEY;
  if (!key) throw new Error('Kurv not configured — set KURV_SECRET_KEY');
  return key;
}

async function callApi(method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown): Promise<any> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getSecretKey()}`,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const message = data?.message || data?.result_description || `Kurv request failed (${res.status})`;
    const err: any = new Error(message);
    err.kurvResponse = data;
    err.status = res.status;
    throw err;
  }
  return data;
}

export type KurvPaymentFrequency = 'ONE-TIME' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

interface CreatePaymentRequestArgs {
  email: string;
  firstName: string;
  lastName?: string;
  amount: number; // decimal dollars, e.g. 10.00
  currency?: string; // default 'USD'
  referenceNumber: string;
  redirectUrl: string;
  cancelUrl: string;
  responseUrl: string;
  paymentFrequency: KurvPaymentFrequency;
  paymentStartDate?: Date;
}

interface CreatePaymentRequestResult {
  transactionId: string;
  shortUrl: string;
  longUrl: string;
  qrcodeLink: string;
}

// POST /payment-requests/ — creates a hosted checkout link. This alone does NOT
// mean the customer has paid; it only becomes a confirmed payment once they
// complete checkout at shortUrl/longUrl and Kurv calls responseUrl.
export async function createPaymentRequest({
  email, firstName, lastName, amount, currency = 'USD', referenceNumber,
  redirectUrl, cancelUrl, responseUrl, paymentFrequency, paymentStartDate,
}: CreatePaymentRequestArgs): Promise<CreatePaymentRequestResult> {
  const data = await callApi('POST', '/payment-requests/', {
    request_methods: ['WEB'], // we present the link ourselves — don't have Kurv email/SMS it
    reference_number: referenceNumber,
    email,
    customer_first_name: firstName,
    customer_last_name: lastName || '',
    redirect_url: redirectUrl,
    cancel_url: cancelUrl,
    response_url: responseUrl,
    fixed_amount: true,
    currency,
    amount,
    payment_type: 'DB',
    payment_frequency: paymentFrequency,
    ...(paymentFrequency !== 'ONE-TIME'
      ? { payment_start_date: (paymentStartDate ?? new Date()).toISOString() }
      : {}),
  });
  return {
    transactionId: data.transaction_id,
    shortUrl: data.short_url,
    longUrl: data.long_url,
    qrcodeLink: data.qrcode_link,
  };
}

interface KurvPaymentDetail {
  paymentId: string;
  transactionId: string;
  status: string; // e.g. 'success'
  amount: number;
  currency: string;
  referenceNumber: string;
}

// GET /payments/{payment_id} — authoritative, server-to-server status check.
// The webhook handler uses this instead of trusting the POSTed payload, since
// Kurv doesn't document a signature scheme for response_url callbacks.
export async function getPayment(paymentId: string): Promise<KurvPaymentDetail> {
  const data = await callApi('GET', `/payments/${encodeURIComponent(paymentId)}`);
  const p = data.payment ?? data;
  return {
    paymentId: p.payment_id,
    transactionId: p.transaction_id,
    status: p.status,
    amount: Number(p.amount),
    currency: p.currency,
    referenceNumber: p.reference_number,
  };
}

// DELETE /payments/subscription/{payment_id} — stops future recurring charges
// on an already-paid scheduled payment. Not wired to a route yet (mirrors
// Authorize.Net's cancelSubscription(), which also has no route today) —
// add a POST /cancel in kurvBilling.ts when self-serve cancellation ships.
export async function endSubscription(paymentId: string): Promise<void> {
  await callApi('DELETE', `/payments/subscription/${encodeURIComponent(paymentId)}`);
}
