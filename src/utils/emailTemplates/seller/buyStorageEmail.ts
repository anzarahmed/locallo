import { renderSellerEmail, sellerPanelUrl } from '../sellerEmailLayout';
import type { EmailContent } from '../sellerEmailLayout';

export function buyStorageEmail(sellerName: string): EmailContent {
  return renderSellerEmail('Need More Space for Your Products?', {
    sellerName,
    paragraphs: [
      'Want to showcase more products on Loccalo?',
      'Your current product storage is limited. Adding more storage allows you to expand your catalogue and showcase additional products to customers.',
      'Whether you’re adding new collections or expanding existing categories, more space means more products you can display.',
    ],
    cta: { label: 'BUY ADDITIONAL STORAGE', url: sellerPanelUrl('/dashboard') },
    afterCta: ['Keep growing your Loccalo store!'],
  });
}
