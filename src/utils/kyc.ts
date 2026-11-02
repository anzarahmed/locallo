import type { KycDocumentType, KycDocuments } from '../types';

export const KYC_DOCUMENT_TYPES: KycDocumentType[] = ['aadhar', 'aadharBack', 'pan', 'registrationCertificate', 'other'];

export function hasRequiredKycDocuments(docs: Partial<KycDocuments>): boolean {
  return Boolean(docs.aadhar && docs.aadharBack && docs.pan);
}
