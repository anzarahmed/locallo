import nodemailer from 'nodemailer';
import { kycVerificationEmail } from './emailTemplates/kycVerificationEmail';
import { offerNotificationEmail } from './emailTemplates/offerNotificationEmail';
import { boostPaymentConfirmedEmail } from './emailTemplates/boostPaymentConfirmedEmail';
import { boostPaymentFailedEmail } from './emailTemplates/boostPaymentFailedEmail';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
  connectionTimeout: 10_000,
  greetingTimeout: 10_000,
  socketTimeout: 10_000,
});

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  await transporter.sendMail({
    from: `"Localo Admin" <${process.env.GMAIL_USER}>`,
    to,
    subject: 'Reset your Localo Admin password',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#4338ca">Reset your password</h2>
        <p>Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
        <a href="${resetUrl}"
           style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;
                  text-decoration:none;border-radius:6px;font-weight:600;margin:16px 0">
          Reset password
        </a>
        <p style="color:#6b7280;font-size:13px">If you didn't request this, you can safely ignore this email.</p>
        <p style="color:#6b7280;font-size:13px">Or copy this link: ${resetUrl}</p>
      </div>
    `,
  });
}

export async function sendKycVerificationEmail(
  to: string,
  businessName: string,
  verified: boolean,
): Promise<void> {
  const { subject, html } = kycVerificationEmail(businessName, verified);

  await transporter.sendMail({
    from: `"Localo" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html,
  });
}

export async function sendOfferNotificationEmail(
  to: string,
  offerTitle: string,
  offerDescription: string | null,
): Promise<void> {
  const { subject, html } = offerNotificationEmail(offerTitle, offerDescription);

  await transporter.sendMail({
    from: `"Localo" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html,
  });
}

export async function sendBoostPaymentConfirmedEmail(
  to: string,
  businessName: string,
  productName: string,
  amount: number,
): Promise<void> {
  const { subject, html } = boostPaymentConfirmedEmail(businessName, productName, amount);

  await transporter.sendMail({
    from: `"Localo" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html,
  });
}

export async function sendBoostPaymentFailedEmail(
  to: string,
  businessName: string,
  productName: string,
  amount: number,
): Promise<void> {
  const { subject, html } = boostPaymentFailedEmail(businessName, productName, amount);

  await transporter.sendMail({
    from: `"Localo" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html,
  });
}
