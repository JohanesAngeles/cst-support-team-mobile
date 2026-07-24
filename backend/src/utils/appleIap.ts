import fs from 'fs';
import path from 'path';
import {
  SignedDataVerifier,
  Environment,
  JWSTransactionDecodedPayload,
  ResponseBodyV2DecodedPayload,
} from '@apple/app-store-server-library';

const BUNDLE_ID = process.env.APPLE_BUNDLE_ID ?? 'com.cst.driver';
const APP_APPLE_ID = process.env.APPLE_APP_APPLE_ID ? Number(process.env.APPLE_APP_APPLE_ID) : 6791781842;
const ENVIRONMENT = process.env.APPLE_IAP_ENVIRONMENT === 'Sandbox' ? Environment.SANDBOX : Environment.PRODUCTION;

export const APPLE_PRODUCT_TO_PLAN: Record<string, 'monthly' | 'annual'> = {
  'com.cst.driver.partner.monthly': 'monthly',
  'com.cst.driver.partner.annual': 'annual',
};

let _verifier: SignedDataVerifier | null = null;
function getVerifier(): SignedDataVerifier {
  if (!_verifier) {
    const rootCert = fs.readFileSync(path.join(__dirname, '..', 'certs', 'AppleRootCA-G3.cer'));
    _verifier = new SignedDataVerifier(
      [rootCert],
      true,
      ENVIRONMENT,
      BUNDLE_ID,
      ENVIRONMENT === Environment.SANDBOX ? undefined : APP_APPLE_ID,
    );
  }
  return _verifier;
}

export async function verifyAppleTransaction(signedTransactionInfo: string): Promise<JWSTransactionDecodedPayload> {
  return getVerifier().verifyAndDecodeTransaction(signedTransactionInfo);
}

export async function verifyAppleNotification(signedPayload: string): Promise<ResponseBodyV2DecodedPayload> {
  return getVerifier().verifyAndDecodeNotification(signedPayload);
}
