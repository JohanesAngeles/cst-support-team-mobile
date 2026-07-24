import client from './client';

export const billingAPI = {
  verifyApplePurchase: (signedTransactionInfo: string) =>
    client.post('/billing/apple/verify', { signedTransactionInfo }),
};
