import { renderSellerEmail, sellerPanelUrl } from '../sellerEmailLayout';
import type { EmailContent } from '../sellerEmailLayout';

export function startUploadingEmail(sellerName: string): EmailContent {
  return renderSellerEmail('Your Store Is Ready – Start Uploading Products', {
    sellerName,
    paragraphs: [
      'Your Loccalo seller account is ready. Now it’s time to add your products!',
      'Upload your products with complete details, attractive images, pricing, and inventory information so customers can easily discover and shop from your store.',
      'The more relevant products you showcase, the more opportunities you have to reach potential customers.',
    ],
    cta: { label: 'UPLOAD PRODUCTS', url: sellerPanelUrl('/products/add') },
    afterCta: ['Let’s get your store ready for business!'],
  });
}
