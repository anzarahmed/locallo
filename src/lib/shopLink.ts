const CUSTOMER_SITE_URL: string = (import.meta.env.VITE_CUSTOMER_SITE_URL ?? 'https://loccalo.in/customer').replace(/\/+$/, '');

export function shopLinkUrl(sellerId: string, shopName: string): string {
  return `${CUSTOMER_SITE_URL}/shop/${encodeURIComponent(sellerId)}?${new URLSearchParams({ title: shopName }).toString()}`;
}
