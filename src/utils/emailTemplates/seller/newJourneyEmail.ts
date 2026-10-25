import { renderSellerEmail, sellerPanelUrl } from '../sellerEmailLayout';
import type { EmailContent } from '../sellerEmailLayout';

export function newJourneyEmail(sellerName: string): EmailContent {
  return renderSellerEmail('Congratulations on Starting Your Selling Journey with Loccalo!', {
    sellerName,
    paragraphs: [
      'Congratulations and welcome to your new journey with Loccalo!',
      'Your store is now part of our growing seller community. This is the beginning of an exciting opportunity to showcase your products and connect with customers.',
      'Start by setting up your store, uploading your products, and making your products discoverable.',
      'We’re happy to have you with us and look forward to seeing your business grow on Loccalo.',
    ],
    cta: { label: 'START SELLING', url: sellerPanelUrl('/dashboard') },
  });
}
