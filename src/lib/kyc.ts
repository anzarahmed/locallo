import type { KycDocuments } from '../types';

export function hasRequiredKycDocuments(docs: Partial<KycDocuments> | undefined): boolean {
  return Boolean(docs?.aadhar && docs?.aadharBack && docs?.pan);
}
