// ─── Google OAuth Client IDs ──────────────────────────────────────────────────
// Get these from https://console.cloud.google.com/
// Project → APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID
//
// You need THREE client IDs:
//  1. Web application   → used by Expo Go (development)
//  2. iOS               → bundle ID: com.cst.driver  (EAS / TestFlight)
//  3. Android           → package: com.cst.driver + SHA-1 fingerprint (EAS / Play Store)
//
// All three must have "Authorized redirect URIs" / "Allowed origins" configured
// in the Google Cloud Console for the flows to succeed.

export const GOOGLE_WEB_CLIENT_ID     = 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com';
export const GOOGLE_IOS_CLIENT_ID     = 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com';
export const GOOGLE_ANDROID_CLIENT_ID = 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com';
