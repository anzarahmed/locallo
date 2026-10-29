import { renderSellerEmail, sellerPanelUrl } from '../sellerEmailLayout';
import type { EmailContent } from '../sellerEmailLayout';

export function uploadLimitReachedEmail(sellerName: string, categoryName: string): EmailContent {
  return renderSellerEmail(`You’ve Used 90% of Your ${categoryName} Listing Limit`, {
    sellerName,
    paragraphs: [
      'You’re making great progress with your Loccalo store!',
      'You have now used 90% of your available product upload limit.',
      'If you have more products to showcase, consider adding additional storage so you can continue expanding your product catalogue, contact to Loccalo admin.',
    ],
    cta: { label: 'VIEW LISTING LIMITS', url: sellerPanelUrl('/product-limits') },
  });
}
