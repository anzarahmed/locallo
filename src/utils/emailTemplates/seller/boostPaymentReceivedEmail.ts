import { renderSellerEmail, sellerPanelUrl } from '../sellerEmailLayout';
import type { EmailContent } from '../sellerEmailLayout';

export interface BoostPaymentDetails {
  productName: string;
  amount: number;
  transactionId: string;
  campaign: string;
}

export function boostPaymentReceivedEmail(sellerName: string, boost: BoostPaymentDetails): EmailContent {
  return renderSellerEmail('Payment Received – Your Product Boost Is Active', {
    sellerName,
    paragraphs: ['We’ve successfully received your payment for the Loccalo Boost campaign.', 'Boost Details:'],
    details: [
      { label: 'Product', value: boost.productName },
      { label: 'Amount', value: `₹${boost.amount.toLocaleString('en-IN')}` },
      { label: 'Transaction ID', value: boost.transactionId },
      { label: 'Campaign', value: boost.campaign },
      { label: 'Status', value: 'Active' },
    ],
    beforeCta: ['Your product boost is now active according to the selected campaign.'],
    cta: { label: 'VIEW BOOST DETAILS', url: sellerPanelUrl('/payments') },
    afterCta: ['Thank you for choosing Loccalo to promote your products.'],
  });
}
