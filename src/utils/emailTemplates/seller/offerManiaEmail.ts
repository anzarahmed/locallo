import { renderSellerEmail, sellerPanelUrl } from '../sellerEmailLayout';
import type { EmailContent } from '../sellerEmailLayout';

export function offerManiaEmail(sellerName: string, offerId: number): EmailContent {
  return renderSellerEmail('🔥 Join Offer Mania and Attract More Customers', {
    sellerName,
    paragraphs: [
      'It’s time to put your products in the spotlight!',
      'Join Offer Mania on Loccalo and participate in promotional offers designed to help customers discover exciting products and deals.',
      'You can select eligible products, create attractive offers, and give customers another reason to shop from your store.',
    ],
    cta: { label: 'JOIN OFFER MANIA', url: sellerPanelUrl(`/offers/${offerId}`) },
    afterCta: ['Don’t miss the opportunity to showcase your products during the campaign.'],
  });
}
