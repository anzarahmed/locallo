import { renderSellerEmail, sellerPanelUrl } from '../sellerEmailLayout';
import type { EmailContent } from '../sellerEmailLayout';

export function boostTargetReachedEmail(
  sellerName: string,
  productId: string | null,
  productName: string,
  targetImpressions: number,
): EmailContent {
  const target = `${targetImpressions.toLocaleString('en-IN')} impressions`;
  return renderSellerEmail('🎉 Your Product Has Reached Its Boost Target!', {
    sellerName,
    paragraphs: [
      'Congratulations!',
      `Your product ${productName} has reached the ${target} target set for your Boost campaign.`,
      'Your product has gained significant visibility through the campaign.',
      'Want to continue promoting it and reach more potential customers?',
    ],
    cta: { label: 'BOOST AGAIN', url: sellerPanelUrl(productId ? `/products/${productId}` : '/products') },
    afterCta: ['Keep the momentum going!'],
  });
}
