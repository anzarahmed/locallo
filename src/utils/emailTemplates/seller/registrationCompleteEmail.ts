import { renderSellerEmail, sellerPanelUrl } from '../sellerEmailLayout';
import type { EmailContent } from '../sellerEmailLayout';

export function registrationCompleteEmail(sellerName: string): EmailContent {
  return renderSellerEmail('Welcome to Loccalo – Your Seller Registration is Complete', {
    sellerName,
    paragraphs: [
      'Congratulations! Your registration with Loccalo has been successfully completed.',
      'Your seller account is now ready, and you can start setting up your store and showcasing your products to customers.',
      'Here’s what you can do next:',
    ],
    bullets: [
      'Complete your seller profile',
      'Complete KYC, if pending',
      'Upload your products',
      'Set up your store information',
      'Start reaching customers',
    ],
    cta: { label: 'GET STARTED', url: sellerPanelUrl('/dashboard') },
    beforeCta: ['We’re excited to have you join the Loccalo seller community.'],
  });
}
