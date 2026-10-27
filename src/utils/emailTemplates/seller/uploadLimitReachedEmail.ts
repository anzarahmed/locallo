import { renderSellerEmail, sellerPanelUrl } from '../sellerEmailLayout';
import type { EmailContent } from '../sellerEmailLayout';

export function uploadLimitReachedEmail(
  sellerName: string,
  categoryName: string,
  used: number,
  limit: number,
): EmailContent {
  const remaining = Math.max(0, limit - used);
  return renderSellerEmail(`You’ve Used 90% of Your ${categoryName} Listing Limit`, {
    sellerName,
    paragraphs: [
      'You’re making great progress with your Loccalo store!',
      `You have now used ${used} of ${limit} product listings in ${categoryName}, so only ${remaining} remain.`,
      'Each product without variants, and each variant group (for example, one colour of a T-shirt), uses one listing. Deleting a product or variant group does not restore a listing.',
    ],
    cta: { label: 'VIEW LISTING LIMITS', url: sellerPanelUrl('/product-limits') },
    afterCta: ['Your other categories have their own separate limits.'],
  });
}
