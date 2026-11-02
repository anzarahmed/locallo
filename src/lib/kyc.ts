import type { KycDocumentType, KycDocuments } from '../types';

export function hasRequiredKycDocuments(docs: Partial<KycDocuments> | null | undefined): boolean {
  return Boolean(docs?.aadhar && docs.aadharBack && docs.pan);
}

export const KYC_ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf';

export function isPdfUrl(url: string): boolean {
  return url.split('?')[0].toLowerCase().endsWith('.pdf');
}

export const KYC_DOCUMENT_LABELS: Record<KycDocumentType, string> = {
  aadhar:                  'Aadhaar front',
  aadharBack:              'Aadhaar back',
  pan:                     'PAN card',
  registrationCertificate: 'Registration certificate',
  other:                   'Other document',
};
