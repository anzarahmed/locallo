import { renderSellerEmail, sellerPanelUrl } from '../sellerEmailLayout';
import type { EmailContent } from '../sellerEmailLayout';

export function boostSuggestionEmail(sellerName: string): EmailContent {
  return renderSellerEmail('🚀 Give Your Product More Visibility with Boost', {
    sellerName,
    paragraphs: [
      'Want to give your product additional visibility?',
      'With Loccalo Boost, you can promote selected products and put them in front of more potential customers.',
      'Choose the product you want to promote, select your boost option, and get started.',
    ],
    cta: { label: 'BOOST YOUR PRODUCT', url: sellerPanelUrl('/products') },
    afterCta: ['Give your products an extra opportunity to be discovered.'],
  });
}
