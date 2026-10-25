import { renderSellerEmail, sellerPanelUrl } from '../sellerEmailLayout';
import type { EmailContent } from '../sellerEmailLayout';

export function inactiveSellerEmail(sellerName: string): EmailContent {
  return renderSellerEmail('We Miss You! Your Loccalo Store Has Been Inactive', {
    sellerName,
    paragraphs: [
      'We noticed that you haven’t been active on Loccalo for more than 30 days.',
      'Your customers are still discovering products every day. Keep your store active by uploading new products, updating your catalogue, refreshing inventory, and participating in available promotions.',
      'Regular activity can help you keep your store fresh and give customers more products to discover.',
    ],
    cta: { label: 'VISIT YOUR SELLER DASHBOARD', url: sellerPanelUrl('/dashboard') },
    afterCta: ['We look forward to seeing you back on Loccalo!'],
  });
}
