import { renderSellerEmail, sellerPanelUrl } from '../sellerEmailLayout';
import type { EmailContent } from '../sellerEmailLayout';

export function boostPaymentFailedEmail(sellerName: string, productName: string, amount: number): EmailContent {
  return renderSellerEmail(`Payment failed — your boost for "${productName}" wasn't activated`, {
    sellerName,
    paragraphs: [
      `Your payment of ₹${amount.toLocaleString('en-IN')} for boosting ${productName} could not be completed, so the boost was not activated.`,
      'You can try boosting the product again from the Seller Panel.',
    ],
    cta: { label: 'VIEW PRODUCTS', url: sellerPanelUrl('/products') },
  });
}
