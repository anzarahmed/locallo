import type { KycDocuments } from '../types';

export function aadhaarSidesUploaded(docs: Partial<KycDocuments> | undefined): number {
  return (docs?.aadhar ? 1 : 0) + (docs?.aadharBack ? 1 : 0);
}

export function isAadhaarComplete(docs: Partial<KycDocuments> | undefined): boolean {
  return aadhaarSidesUploaded(docs) === 2;
}

export function hasRequiredKycDocuments(docs: Partial<KycDocuments> | undefined): boolean {
  return isAadhaarComplete(docs) && Boolean(docs?.pan);
}
