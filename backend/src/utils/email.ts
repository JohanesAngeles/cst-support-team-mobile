import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT ?? '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM = process.env.FROM_EMAIL ?? 'CST App <noreply@cst-app.com>';

const canSend = () => !!(process.env.SMTP_USER && process.env.SMTP_PASS);

export const sendVerificationEmail = async (to: string, name: string, code: string) => {
  if (!canSend()) {
    console.log(`[EMAIL] Verification code for ${to}: ${code}`);
    return;
  }
  await transporter.sendMail({
    from: FROM,
    to,
    subject: 'Verify your CST account',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#1A3A5C">Verify Your Email</h2>
        <p>Hi ${name},</p>
        <p>Enter this code in the app to verify your email address:</p>
        <div style="font-size:36px;font-weight:900;letter-spacing:8px;color:#F5A623;padding:20px 0">${code}</div>
        <p style="color:#888">This code expires in 10 minutes.</p>
        <p style="color:#888;font-size:12px">If you didn't create a CST account, ignore this email.</p>
      </div>
    `,
  });
};

export const sendPasswordResetEmail = async (to: string, name: string, code: string) => {
  if (!canSend()) {
    console.log(`[EMAIL] Password reset code for ${to}: ${code}`);
    return;
  }
  await transporter.sendMail({
    from: FROM,
    to,
    subject: 'Reset your CST password',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#1A3A5C">Password Reset</h2>
        <p>Hi ${name},</p>
        <p>Enter this code in the app to reset your password:</p>
        <div style="font-size:36px;font-weight:900;letter-spacing:8px;color:#F5A623;padding:20px 0">${code}</div>
        <p style="color:#888">This code expires in 10 minutes.</p>
        <p style="color:#888;font-size:12px">If you didn't request a reset, ignore this email.</p>
      </div>
    `,
  });
};
