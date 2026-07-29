import client from './client';

export const billingAPI = {
  verifyApplePurchase: (signedTransactionInfo: string) =>
    client.post('/billing/apple/verify', { signedTransactionInfo }),
  validatePromo: (code: string, plan?: 'monthly' | 'annual') =>
    client.post('/billing/validate-promo', { code, plan }),
  getAuthorizeNetConfig: () =>
    client.get<{ apiLoginId: string | null; clientKey: string | null; env: 'sandbox' | 'production' }>('/billing/authorizenet/config'),
  subscribeAuthorizeNet: (body: {
    plan: 'monthly' | 'annual';
    opaqueDataDescriptor: string;
    opaqueDataValue: string;
    promoCode?: string;
  }) => client.post('/billing/authorizenet/subscribe', body),
};
