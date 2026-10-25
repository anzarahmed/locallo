import { renderSellerEmail, sellerPanelUrl } from '../sellerEmailLayout';
import type { EmailContent } from '../sellerEmailLayout';

export function uploadLimitReachedEmail(sellerName: string): EmailContent {
  return renderSellerEmail('You’ve Used 90% of Your Product Upload Limit', {
    sellerName,
    paragraphs: [
      'You’re making great progress with your Loccalo store!',
      'You have now used 90% of your available product upload limit.',
      'If you have more products to showcase, consider adding additional storage so you can continue expanding your product catalogue.',
    ],
    cta: { label: 'GET MORE STORAGE', url: sellerPanelUrl('/dashboard') },
    afterCta: ['Keep adding products and give customers more reasons to visit your store.'],
  });
}
