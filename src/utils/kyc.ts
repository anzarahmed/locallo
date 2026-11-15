import type { KycDocumentType, KycDocuments, KycRejection } from '../types';

export const KYC_DOCUMENT_TYPES: KycDocumentType[] = ['aadhar', 'aadharBack', 'pan', 'registrationCertificate', 'other'];

export const REQUIRED_KYC_DOCUMENT_TYPES: KycDocumentType[] = ['aadhar', 'aadharBack', 'pan'];

export function isRequiredKycDocument(type: KycDocumentType): boolean {
  return REQUIRED_KYC_DOCUMENT_TYPES.includes(type);
}

export function hasRequiredKycDocuments(docs: Partial<KycDocuments>): boolean {
  return REQUIRED_KYC_DOCUMENT_TYPES.every((type) => Boolean(docs[type]));
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
