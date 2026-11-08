import type { KycDocumentType, KycDocuments, KycRejection } from '../types';

export function hasRequiredKycDocuments(docs: Partial<KycDocuments> | null | undefined): boolean {
  return Boolean(docs?.aadhar && docs.aadharBack && docs.pan);
}

interface KycUploadState {
  isVerified: boolean;
  kycDocuments?: Partial<KycDocuments> | null;
  kycRejection?: KycRejection | null;
}

export function canUploadKycDocuments({ isVerified, kycDocuments, kycRejection }: KycUploadState): boolean {
  if (isVerified) return false;
  return !hasRequiredKycDocuments(kycDocuments) || Boolean(kycRejection);
}

export const KYC_ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf';
export const KYC_MAX_BYTES = 10 * 1024 * 1024;

export function kycFileError(file: File): string | null {
  if (!KYC_ACCEPT.split(',').includes(file.type)) return 'Only JPG, PNG, WebP or PDF files are allowed';
  if (file.size > KYC_MAX_BYTES) return 'File must be 10 MB or smaller';
  return null;
}

export interface StagedKycFile {
  file: File;
  previewUrl: string | null;
}

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
