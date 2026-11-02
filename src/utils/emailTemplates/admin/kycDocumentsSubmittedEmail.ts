import { renderSellerEmail } from '../sellerEmailLayout';
import type { EmailContent } from '../sellerEmailLayout';

export interface KycSubmittedSeller {
  id: string;
  businessName: string;
  ownerName: string | null;
  mobile: string;
}

function adminPanelUrl(path: string): string {
  const base = (process.env.ADMIN_PANEL_URL ?? 'http://localhost:5173').replace(/\/+$/, '');
  return `${base}${path}`;
}

export function kycDocumentsSubmittedEmail(adminName: string, seller: KycSubmittedSeller): EmailContent {
  return renderSellerEmail(`KYC documents submitted: ${seller.businessName}`, {
    sellerName: adminName,
    paragraphs: [
      `${seller.businessName} has uploaded all the required KYC documents (Aadhaar front, Aadhaar back and PAN).`,
      "Please review and verify the documents to activate the seller's KYC.",
    ],
    details: [
      { label: 'Business', value: seller.businessName },
      { label: 'Owner', value: seller.ownerName ?? '—' },
      { label: 'Mobile', value: seller.mobile },
    ],
    cta: { label: 'REVIEW DOCUMENTS', url: adminPanelUrl(`/sellers?view=${encodeURIComponent(seller.id)}`) },
  });
}
