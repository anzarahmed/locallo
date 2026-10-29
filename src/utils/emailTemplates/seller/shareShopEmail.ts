import { renderSellerEmail } from '../sellerEmailLayout';
import type { EmailContent } from '../sellerEmailLayout';

export function shopLinkUrl(sellerId: string, shopName: string): string {
  const base = (process.env.SHOP_LINK_BASE_URL ?? 'https://loccalo.in').replace(/\/+$/, '');
  return `${base}/shop/${encodeURIComponent(sellerId)}?${new URLSearchParams({ title: shopName }).toString()}`;
}

export function shareShopEmail(sellerName: string, sellerId: string, shopName: string): EmailContent {
  const shopLink = shopLinkUrl(sellerId, shopName);
  return renderSellerEmail('Your New Products Are Live – Share Your Loccalo Shop', {
    sellerName,
    paragraphs: [
      'Your new products are now live on Loccalo!',
      'Make it easier for customers to discover your complete catalogue by sharing your Loccalo Shop Link with your customers, friends, and followers.',
    ],
    details: [{ label: 'Your Shop Link', value: shopLink }],
    beforeCta: ['Share your shop and let customers explore all your products in one place.'],
    cta: { label: 'SHARE YOUR SHOP', url: shopLink },
  });
}
