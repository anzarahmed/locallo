import { renderSellerEmail, sellerPanelUrl } from '../sellerEmailLayout';
import type { EmailContent } from '../sellerEmailLayout';

export function kycRejectedEmail(sellerName: string, documents: string, reason: string | null): EmailContent {
  return renderSellerEmail('Action Required: Re-upload Your KYC Documents', {
    sellerName,
    paragraphs: [
      'We reviewed your KYC documents and could not accept some of them.',
      `Documents to re-upload: ${documents}`,
      ...(reason ? [`Reason: ${reason}`] : []),
      'Please upload clear, valid copies so we can complete your verification on Loccalo.',
    ],
    cta: { label: 'RE-UPLOAD YOUR DOCUMENTS', url: sellerPanelUrl('/kyc-documents') },
    afterCta: ['If you have any questions, contact support.'],
  });
}
