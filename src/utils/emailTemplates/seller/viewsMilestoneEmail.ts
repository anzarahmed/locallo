import { renderSellerEmail, sellerPanelUrl } from '../sellerEmailLayout';
import type { EmailContent } from '../sellerEmailLayout';

export function viewsMilestoneEmail(
  sellerName: string,
  productId: string,
  productName: string,
  viewCount: number,
): EmailContent {
  const views = viewCount.toLocaleString('en-IN');
  return renderSellerEmail(`🎉 Your Product Just Reached ${views} Views!`, {
    sellerName,
    paragraphs: [
      `Great news! Your product ${productName} has reached ${views} views on Loccalo.`,
      'That means customers are discovering and viewing your product.',
      'Keep your product information, pricing, inventory, and images updated to provide customers with a great shopping experience.',
      'Want to reach even more customers?',
    ],
    cta: { label: 'BOOST YOUR PRODUCT', url: sellerPanelUrl(`/products/${productId}`) },
    afterCta: ['Keep growing!'],
  });
}
