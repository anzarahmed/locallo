import { renderSellerEmail, sellerPanelUrl } from '../sellerEmailLayout';
import type { EmailContent } from '../sellerEmailLayout';

export function closingSoonEmail(sellerName: string, closingTime: string): EmailContent {
  return renderSellerEmail('⏰ Your Shop Is Closing Soon – Extend Your Hours?', {
    sellerName,
    paragraphs: [
      'Your Loccalo shop is approaching its scheduled closing time for today.',
      'If you’re available to continue accepting customers, you can extend your shop hours for today.',
    ],
    highlight: `Current Closing Time: ${closingTime}`,
    cta: { label: 'EXTEND SHOP HOURS', url: sellerPanelUrl('/profile') },
    beforeCta: ['Would you like to keep your store open longer?'],
    afterCta: ['You can update your availability from your seller dashboard.'],
  });
}
