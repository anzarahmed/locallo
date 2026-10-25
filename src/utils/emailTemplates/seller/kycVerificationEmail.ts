import { renderSellerEmail, sellerPanelUrl } from '../sellerEmailLayout';
import type { EmailContent } from '../sellerEmailLayout';

export function kycVerificationEmail(sellerName: string, businessName: string, verified: boolean): EmailContent {
  if (verified) {
    return renderSellerEmail('Your KYC verification is complete', {
      sellerName,
      paragraphs: [
        `Congratulations! The KYC documents for ${businessName} have been reviewed and your seller account is now verified on Loccalo.`,
      ],
      cta: { label: 'GO TO DASHBOARD', url: sellerPanelUrl('/dashboard') },
    });
  }
  return renderSellerEmail('Your KYC verification has been revoked', {
    sellerName,
    paragraphs: [
      `Your seller verification for ${businessName} on Loccalo has been revoked. Please contact support or re-submit your KYC documents.`,
    ],
    cta: { label: 'VIEW PROFILE', url: sellerPanelUrl('/profile') },
  });
}
