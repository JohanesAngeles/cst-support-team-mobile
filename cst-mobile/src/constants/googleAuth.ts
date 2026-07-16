// ─── Google OAuth Client IDs ──────────────────────────────────────────────────
// Get these from https://console.cloud.google.com/ → APIs & Services → Credentials
//
// @react-native-google-signin/google-signin only needs two of the three client
// types Google offers:
//  1. Web application → passed as `webClientId` below (also used server-side by
//     the backend to verify ID token audience — keep GOOGLE_WEB_CLIENT_ID in
//     backend/.env in sync with this value)
//  2. iOS             → passed as `iosClientId` below, bundle ID: com.cst.driver
//     Its "reversed client ID" (com.googleusercontent.apps.XXXX) must also be
//     set as `iosUrlScheme` in the google-signin plugin config in app.json.
//
// Android needs its own OAuth client in the same Google Cloud project (type:
// Android, package: com.cst.driver, + your build's SHA-1 fingerprint), but the
// library doesn't take an androidClientId — Android matches automatically via
// package name + signing certificate, so there's nothing to reference here.

export const GOOGLE_WEB_CLIENT_ID = '663100579676-rpeqko47ihje3etdis0sqkkarsouam8i.apps.googleusercontent.com';
export const GOOGLE_IOS_CLIENT_ID = '663100579676-4epb15balm8ehefu2s8cuqd2d2v05djd.apps.googleusercontent.com';
