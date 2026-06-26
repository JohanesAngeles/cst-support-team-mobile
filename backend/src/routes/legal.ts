import { Router, Request, Response } from 'express';

const router = Router();

const HTML = (title: string, sections: { h: string; p: string }[], effective = 'January 1, 2025') => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title} — Road Ready Network</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0D1F33;color:#B0C4DE;line-height:1.7;padding:0}
  .wrap{max-width:760px;margin:0 auto;padding:40px 24px 80px}
  .logo{color:#F5A623;font-size:28px;font-weight:900;letter-spacing:1px;margin-bottom:4px}
  .logo span{color:#B0C4DE;font-size:14px;font-weight:400;display:block;letter-spacing:0}
  h1{color:#fff;font-size:26px;font-weight:900;margin:32px 0 4px}
  .eff{color:#5577AA;font-size:12px;margin-bottom:24px}
  .intro{background:#1A3A5C;border-radius:10px;padding:16px 20px;margin-bottom:28px;color:#8AAAC8;font-size:14px}
  h2{color:#F5A623;font-size:14px;font-weight:800;margin:24px 0 6px;text-transform:uppercase;letter-spacing:.5px}
  p{font-size:14px;margin-bottom:4px}
  footer{margin-top:40px;color:#2A4A6A;font-size:12px;text-align:center}
  a{color:#F5A623}
</style>
</head>
<body>
<div class="wrap">
  <div class="logo">Road Ready<span>Network</span></div>
  <h1>${title}</h1>
  <p class="eff">Effective: ${effective}</p>
  ${sections.map(s => `<h2>${s.h}</h2><p>${s.p.replace(/\n/g, '<br/>')}</p>`).join('')}
  <footer>© ${new Date().getFullYear()} Road Ready Network. All rights reserved.<br/>
  Questions? <a href="mailto:caschooloftruckingofficial@gmail.com">caschooloftruckingofficial@gmail.com</a></footer>
</div>
</body>
</html>`;

const TERMS_SECTIONS = [
  { h: '1. Acceptance of Terms', p: 'By accessing or using the Road Ready Network mobile application, you agree to be bound by these Terms of Service. If you do not agree, do not use the app.' },
  { h: '2. Description of Service', p: 'Road Ready Network provides trucking professionals with tools including IFTA tracking, HOS logging, fuel logs, expense management, AI-assisted legal information, document storage, and related services. The app is intended for lawful commercial use only.' },
  { h: '3. AI Legal Assistant Disclaimer', p: 'The AI Legal Assistant provides general information about trucking law and regulations. It does NOT constitute legal advice and is NOT a substitute for a licensed attorney. Road Ready Network is not a law firm and assumes no liability for actions taken based on AI-generated content.' },
  { h: '4. User Responsibilities', p: 'You are responsible for maintaining the confidentiality of your account credentials, ensuring the accuracy of data you enter, and complying with all applicable federal, state, and local laws including FMCSA regulations.' },
  { h: '5. Subscription & Billing', p: 'Some features require a paid subscription. Subscriptions renew automatically unless cancelled at least 24 hours before the renewal date. Refunds are handled in accordance with the App Store or Google Play policies.' },
  { h: '6. Data Accuracy', p: 'Road Ready Network provides IFTA, HOS, tax, and other calculations as estimates based on user-entered data. Users are responsible for verifying all figures before filing with any government agency. Road Ready Network is not liable for errors resulting from incorrect data entry.' },
  { h: '7. Emergency Services', p: 'The Emergency SOS feature supplements — it does not replace — official emergency services. Always call 911 in a life-threatening emergency. Road Ready Network is not liable for any delay, failure, or outcome related to emergency feature use.' },
  { h: '8. Intellectual Property', p: 'All content, branding, and software in the Road Ready Network app are the property of Road Ready Network. You may not copy, modify, distribute, or reverse-engineer any part of the application.' },
  { h: '9. Limitation of Liability', p: 'To the maximum extent permitted by law, Road Ready Network shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the app, including lost profits or data loss.' },
  { h: '10. Governing Law', p: 'These terms are governed by the laws of the United States. Any disputes shall be resolved through binding arbitration in accordance with the American Arbitration Association rules.' },
  { h: '11. Business Directory & Partner Listings', p: 'The Road Ready Network app includes a directory of partner businesses ("Listings") that drivers may use to locate services. Road Ready Network does not endorse, guarantee, or assume responsibility for the quality, accuracy, or availability of any listed business. Businesses listed on the platform have agreed to separate partner terms. Road Ready Network reserves the right to remove or modify any listing at any time.' },
  { h: '12. User Reviews & Ratings', p: 'Drivers may submit ratings and reviews of listed businesses. By submitting a review, you confirm that it is honest, based on your personal experience, and does not contain false, defamatory, or inappropriate content. Road Ready Network reserves the right to remove any review that violates these standards. Reviews do not represent the views of Road Ready Network.' },
  { h: '13. Founding Partner Program', p: 'Businesses may apply to become Founding Partners of the Road Ready Network. Partner listings are subject to approval. Partners are responsible for the accuracy of their business information. Subscription fees and terms are communicated at time of enrollment. Road Ready Network reserves the right to suspend or remove any partner listing for violations of these terms or for non-payment.' },
  { h: '14. California School of Trucking Endorsement', p: "The Road Ready Network app is endorsed by the California School of Trucking (CST). CST's endorsement does not constitute ownership or operational responsibility for the app. The Road Ready Network app is an independent product operated separately from CST's educational programs." },
  { h: '15. Changes to Terms', p: 'Road Ready Network reserves the right to modify these terms at any time. Continued use of the app after changes constitutes acceptance of the updated terms.' },
  { h: '16. Contact', p: 'For questions about these Terms of Service, contact us at caschooloftruckingofficial@gmail.com.' },
];

const PRIVACY_SECTIONS = [
  { h: '1. Information We Collect', p: 'We collect information you provide when you create an account (name, email address), data you enter into the app (trip logs, fuel stops, expenses, HOS entries, IFTA records, documents), your device location when you use GPS features (Emergency SOS, Find Help), and push notification tokens for sending alerts.' },
  { h: '2. How We Use Your Information', p: "We use your data to provide and improve the Road Ready Network app, calculate IFTA, tax, and HOS estimates, send deadline reminders and push notifications you have opted into, power the AI Legal Assistant and AI Rate Advisor (your messages are sent to Groq's API), and respond to support requests." },
  { h: '3. Data Storage & Security', p: 'Your data is stored on secure servers using MongoDB with industry-standard encryption. Passwords are hashed using bcrypt and never stored in plain text. JWT tokens are used for authentication and expire automatically.' },
  { h: '4. AI Legal Assistant & Third Parties', p: "When you use the AI Legal Assistant or AI Rate Advisor, your messages are processed by Groq's API. Groq's privacy policy applies to this processing. We do not share your personal identity with Groq — only the message content is transmitted." },
  { h: '5. Document Vault', p: "Documents you upload to the Document Vault are stored via Cloudinary's secure cloud storage. Documents are private to your account and are not shared with other users or third parties." },
  { h: '6. Location Data', p: 'Location data is only accessed when you actively use the Emergency SOS or Find Help features. We do not track your location in the background. Location coordinates shared via SMS during SOS are sent directly through your device\'s messaging app — we do not store them.' },
  { h: '7. Push Notifications', p: 'If you enable push notifications, we store your Expo push token to send you deadline reminders and other alerts. You can disable push notifications at any time through your device settings.' },
  { h: '8. Data Retention & Account Deletion', p: 'We retain your data for as long as your account is active. You may delete your account and all associated data at any time from within the app (Settings → Delete Account), or by requesting deletion via email at caschooloftruckingofficial@gmail.com. Deletion removes your profile, trip/expense/HOS records, documents, posts, and messages, and is processed within 30 days. See our Account Deletion page for details.' },
  { h: '9. Your Rights', p: 'You have the right to access, correct, or delete your personal data. You may export your data (IFTA reports, tax prep PDFs) at any time using the in-app export features. Contact us to request a full data export or deletion.' },
  { h: "10. Children's Privacy", p: 'Road Ready Network is intended for commercial trucking professionals aged 18 and older. We do not knowingly collect personal information from children under 13.' },
  { h: '11. Changes to This Policy', p: 'We may update this Privacy Policy periodically. We will notify you of significant changes via push notification or email. Continued use of the app after changes constitutes acceptance.' },
  { h: '12. Contact Us', p: 'For privacy questions or data requests, contact us at:\n\nEmail: caschooloftruckingofficial@gmail.com' },
];

const DELETE_ACCOUNT_SECTIONS = [
  { h: 'How to delete your account', p: 'Open the Road Ready Network app, go to Settings, and select "Delete Account". Confirm the deletion when prompted. Alternatively, email caschooloftruckingofficial@gmail.com from your account email requesting deletion.' },
  { h: 'What gets deleted', p: 'Your profile, trip logs, fuel logs, expenses, HOS/IFTA/DVIR records, uploaded documents, network posts, messages, and all other personal data associated with your account.' },
  { h: 'Retention period', p: 'Account deletion is processed immediately when requested in-app. Email requests are processed within 30 days. Some anonymized records may be retained as required by law.' },
];

router.get('/terms', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(HTML('Terms of Service', TERMS_SECTIONS, 'June 1, 2026'));
});

router.get('/privacy', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(HTML('Privacy Policy', PRIVACY_SECTIONS));
});

router.get('/delete-account', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(HTML('Account Deletion', DELETE_ACCOUNT_SECTIONS));
});

export default router;
