import { Resend } from 'resend';
import nodemailer from 'nodemailer';

const FROM = process.env.FROM_EMAIL ?? 'CST App <onboarding@resend.dev>';

// ── Resend (preferred) ────────────────────────────────────────────────────────
const resendClient = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// ── Nodemailer SMTP fallback ───────────────────────────────────────────────────
const smtpReady = () => !!(process.env.SMTP_USER && process.env.SMTP_PASS);
const getTransport = () =>
  nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT ?? '587'),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

async function send(to: string, subject: string, html: string) {
  if (resendClient) {
    await resendClient.emails.send({ from: FROM, to, subject, html });
    return;
  }
  if (smtpReady()) {
    await getTransport().sendMail({ from: FROM, to, subject, html });
    return;
  }
  // Dev fallback — print to console so auth still works locally
  console.log(`[EMAIL DEV] To: ${to} | Subject: ${subject}`);
  const codeMatch = html.match(/font-size:36px[^>]*>(\d{6})</);
  if (codeMatch) console.log(`[EMAIL DEV] Code: ${codeMatch[1]}`);
}

// ── Templates ─────────────────────────────────────────────────────────────────
const codeBlock = (code: string) => `
  <div style="text-align:center;padding:24px 0">
    <div style="display:inline-block;background:#1A3A5C;border-radius:12px;padding:20px 40px">
      <div style="font-size:36px;font-weight:900;letter-spacing:10px;color:#F5A623;font-family:monospace">${code}</div>
    </div>
    <p style="color:#999;font-size:13px;margin-top:12px">Expires in 10 minutes</p>
  </div>`;

const layout = (body: string) => `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:system-ui,sans-serif">
  <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
    <div style="background:#1A3A5C;padding:24px;text-align:center">
      <span style="color:#F5A623;font-size:22px;font-weight:900;letter-spacing:1px">CST Driver</span>
    </div>
    <div style="padding:32px">${body}</div>
    <div style="padding:16px 32px;background:#f4f6f8;text-align:center;color:#999;font-size:12px">
      Commercial Support Technologies · support@cst-app.com
    </div>
  </div>
</body></html>`;

export const sendVerificationEmail = (to: string, name: string, code: string) =>
  send(to, 'Verify your CST account', layout(`
    <h2 style="color:#1A3A5C;margin-top:0">Verify Your Email</h2>
    <p style="color:#444">Hi ${name}, enter this code in the app to verify your email:</p>
    ${codeBlock(code)}
    <p style="color:#999;font-size:12px">If you didn't create a CST account, ignore this email.</p>
  `));

export const sendPasswordResetEmail = (to: string, name: string, code: string) =>
  send(to, 'Reset your CST password', layout(`
    <h2 style="color:#1A3A5C;margin-top:0">Password Reset</h2>
    <p style="color:#444">Hi ${name}, enter this code to reset your password:</p>
    ${codeBlock(code)}
    <p style="color:#999;font-size:12px">If you didn't request a reset, ignore this email.</p>
  `));

export const sendInvoiceEmail = (
  to: string,
  inv: {
    invoiceNumber: string; date: string; dueDate: string;
    billTo: { name: string; address?: string };
    services: { description: string; quantity: number; rate: number; amount: number }[];
    subtotal: number; taxRate: number; taxAmount: number; total: number;
    loadRef?: string; notes?: string;
  }
) => {
  const fmtMoney = (n: number) => `$${n.toFixed(2)}`;
  const rows = inv.services.map(s =>
    `<tr>
      <td style="padding:8px;border-bottom:1px solid #eee">${s.description}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${s.quantity}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${fmtMoney(s.rate)}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;font-weight:700">${fmtMoney(s.amount)}</td>
    </tr>`
  ).join('');

  return send(to, `Invoice ${inv.invoiceNumber} from CST Driver`, layout(`
    <h2 style="color:#1A3A5C;margin-top:0">Invoice ${inv.invoiceNumber}</h2>
    <p style="color:#444"><strong>Bill To:</strong> ${inv.billTo.name}${inv.billTo.address ? `<br/>${inv.billTo.address}` : ''}</p>
    <p style="color:#666;font-size:13px">Date: ${inv.date} &nbsp;|&nbsp; Due: ${inv.dueDate}${inv.loadRef ? ` &nbsp;|&nbsp; Load: ${inv.loadRef}` : ''}</p>
    <table width="100%" style="border-collapse:collapse;margin-top:16px;font-size:14px">
      <thead>
        <tr style="background:#1A3A5C;color:#fff">
          <th style="padding:10px;text-align:left">Description</th>
          <th style="padding:10px;text-align:center">Qty</th>
          <th style="padding:10px;text-align:right">Rate</th>
          <th style="padding:10px;text-align:right">Amount</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="text-align:right;margin-top:16px">
      <p style="color:#666">Subtotal: ${fmtMoney(inv.subtotal)}</p>
      ${inv.taxRate ? `<p style="color:#666">Tax (${inv.taxRate}%): ${fmtMoney(inv.taxAmount)}</p>` : ''}
      <p style="font-size:22px;font-weight:900;color:#1A3A5C">Total: ${fmtMoney(inv.total)}</p>
    </div>
    ${inv.notes ? `<p style="color:#888;font-size:13px;border-top:1px solid #eee;padding-top:12px;margin-top:12px">${inv.notes}</p>` : ''}
    <p style="color:#999;font-size:12px;margin-top:20px">Please remit payment by ${inv.dueDate}. Thank you for your business.</p>
  `));
};
