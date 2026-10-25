import { renderSellerEmail, sellerPanelUrl } from '../sellerEmailLayout';
import type { EmailContent } from '../sellerEmailLayout';

export function completeKycEmail(sellerName: string): EmailContent {
  return renderSellerEmail('Action Required: Complete Your KYC to Activate Your Account', {
    sellerName,
    paragraphs: [
      'Your KYC verification is still pending.',
      'To activate your seller account and access selling features on Loccalo, please complete the required KYC process at the earliest.',
      'Completing your KYC helps us verify your seller information and keep the marketplace secure for buyers and sellers.',
    ],
    cta: { label: 'COMPLETE KYC', url: sellerPanelUrl('/profile') },
    afterCta: ['If you have already completed your KYC, please ignore this email.'],
  });
}
