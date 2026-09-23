import type { CmsAudience } from '../types';

export const CMS_AUDIENCES: CmsAudience[] = ['customer', 'seller'];

export function parseCmsAudience(raw: unknown): CmsAudience {
  return raw === 'seller' ? 'seller' : 'customer';
}
