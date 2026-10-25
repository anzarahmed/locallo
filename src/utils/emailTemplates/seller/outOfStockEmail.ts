import { renderSellerEmail, sellerPanelUrl } from '../sellerEmailLayout';
import type { EmailContent } from '../sellerEmailLayout';

export function outOfStockEmail(sellerName: string): EmailContent {
  return renderSellerEmail('Action Required: Some of Your Products Are Out of Stock', {
    sellerName,
    paragraphs: [
      'Some products in your Loccalo store are currently showing as out of stock.',
      'Out-of-stock products may prevent customers from completing a purchase. Please review your inventory and update the stock availability for the affected products.',
    ],
    cta: { label: 'VIEW OUT-OF-STOCK PRODUCTS', url: sellerPanelUrl('/products') },
    afterCta: ['Keeping your inventory updated helps provide customers with accurate product availability.'],
  });
}
