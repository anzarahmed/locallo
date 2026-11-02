import type { KycDocumentType, KycDocuments, KycRejection } from '../types';

export const KYC_DOCUMENT_TYPES: KycDocumentType[] = ['aadhar', 'aadharBack', 'pan', 'registrationCertificate', 'other'];

export function hasRequiredKycDocuments(docs: Partial<KycDocuments>): boolean {
  return Boolean(docs.aadhar && docs.aadharBack && docs.pan);
}

export const KYC_DOCUMENT_LABELS: Record<KycDocumentType, string> = {
  aadhar: 'Aadhaar card (front)',
  aadharBack: 'Aadhaar card (back)',
  pan: 'PAN card',
  registrationCertificate: 'Registration certificate',
  other: 'Other document',
};

export function isKycRejectionResolved(rejection: KycRejection, docs: KycDocuments): boolean {
  return rejection.documentTypes.every((type) => Boolean(docs[type]));
}
