import { renderSellerEmail, sellerPanelUrl } from '../sellerEmailLayout';
import type { EmailContent } from '../sellerEmailLayout';

export function uploadLimitFullEmail(
  sellerName: string,
  categoryName: string,
  used: number,
  limit: number,
): EmailContent {
  return renderSellerEmail(`You’ve Reached Your ${categoryName} Listing Limit`, {
    sellerName,
    paragraphs: [
      'You’ve been busy growing your Loccalo store!',
      `You have now used 100% of your product upload limit for the ${categoryName} category (${used} out of ${limit} products), so you can’t add more products to this category for now.`,
      'If you have more products to showcase, consider adding additional storage so you can continue expanding your product catalogue, contact to Loccalo admin.',
    ],
    cta: { label: 'VIEW LISTING LIMITS', url: sellerPanelUrl('/product-limits') },
  });
}
