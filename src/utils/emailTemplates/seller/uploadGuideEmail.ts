import { renderSellerEmail, sellerPanelUrl } from '../sellerEmailLayout';
import type { EmailContent } from '../sellerEmailLayout';

export const PRODUCT_UPLOAD_GUIDE_SLUG = 'product-upload-guide';

export function uploadGuideEmail(sellerName: string): EmailContent {
  return renderSellerEmail('Need Help Uploading Products? Here’s How', {
    sellerName,
    paragraphs: [
      'Ready to add products to your Loccalo store?',
      'Uploading products is simple. Add your product images, name, description, price, inventory, and other relevant details to make your products easy for customers to discover.',
      'We’ve prepared a simple guide to help you get started.',
    ],
    cta: { label: 'VIEW PRODUCT UPLOAD GUIDE', url: sellerPanelUrl(`/pages/${PRODUCT_UPLOAD_GUIDE_SLUG}`) },
    afterCta: [
      'Once your products are uploaded, make sure your information and inventory stay updated.',
      'Happy selling!',
    ],
  });
}
