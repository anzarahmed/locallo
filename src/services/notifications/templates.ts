import type { PushChannel, PushClass } from '../../types';

export type NotificationAudience = 'customer' | 'seller';

export interface TemplateParamsMap {
  welcome_customer: Record<string, never>;
  welcome_seller: Record<string, never>;
  seller_registered: Record<string, never>;
  profile_incomplete: Record<string, never>;
  wishlist_weekly: { count: number };
  wishlist_out_of_stock: { productId: string; variantId?: string; productName: string };
  back_in_stock: { productId: string; variantId?: string; productName: string; imageUrl?: string };
  offer_upcoming: { offerId: number; offerTitle: string };
  offer_live: { offerId: number; offerTitle: string; endsAt: Date };
  offer_join: { offerId: number; offerTitle: string; description: string | null };
  first_product_nudge: { reminder: 1 | 2 };
  kyc_pending: Record<string, never>;
  kyc_verified: Record<string, never>;
  kyc_revoked: Record<string, never>;
  views_milestone: { productId: string; productName: string; milestone: number };
  out_of_stock_digest: { count: number };
  seller_inactive: Record<string, never>;
  boost_suggestion: Record<string, never>;
  boost_completed: { boostId: string; productId: string | null; productName: string; target: number };
  boost_paid: { boostId: string; productName: string; amount: number; transactionId: string; campaign: string };
  share_shop: Record<string, never>;
  closing_soon: Record<string, never>;
  upload_limit_90: { categoryId: number; categoryName: string; used: number; limit: number };
  upload_limit_100: { categoryId: number; categoryName: string; used: number; limit: number };
  buy_storage: Record<string, never>;
  account_deleted: { recoveryDays: number };
}

export type NotificationType = keyof TemplateParamsMap;

export interface BuiltNotification {
  title: string;
  body: string;
  screen: string;
  targetId?: string;
  variantId?: string;
  dataTitle?: string;
  params?: Record<string, string>;
  referenceType?: string;
  referenceId?: string;
  imageUrl?: string;
  collapseKey?: string;
  expiresAt?: Date;
}

export interface NotificationTemplate<P> {
  audience: NotificationAudience;
  pushClass: PushClass;
  channel: PushChannel;
  // false = inbox only: the user is already in the app, or the message isn't actionable.
  push: boolean;
  build: (params: P) => BuiltNotification;
}

type TemplateRegistry = { [K in NotificationType]: NotificationTemplate<TemplateParamsMap[K]> };

function formatViews(n: number): string {
  return n >= 1000 ? `${n / 1000}K` : String(n);
}

export const TEMPLATES: TemplateRegistry = {
  welcome_customer: {
    audience: 'customer', pushClass: 'transactional', channel: 'transactional', push: false,
    build: () => ({
      title: 'Welcome to Loccalo!',
      body: 'Join, support & discover amazing local sellers. Shop now.',
      screen: 'home',
    }),
  },
  welcome_seller: {
    audience: 'seller', pushClass: 'transactional', channel: 'transactional', push: false,
    build: () => ({
      title: 'Welcome to Loccalo!',
      body: 'Congratulations on starting your new selling journey with us.',
      screen: 'dashboard',
    }),
  },
  seller_registered: {
    audience: 'seller', pushClass: 'transactional', channel: 'transactional', push: false,
    build: () => ({
      title: 'Your seller registration is complete',
      body: 'Your Loccalo seller account is ready. Set up your store and start adding products.',
      screen: 'dashboard',
    }),
  },
  profile_incomplete: {
    audience: 'customer', pushClass: 'promotional', channel: 'offers', push: true,
    build: () => ({
      title: 'Complete your profile',
      body: 'Get personalised picks and nearby deals in 1 minute.',
      screen: 'profile',
    }),
  },
  wishlist_weekly: {
    audience: 'customer', pushClass: 'promotional', channel: 'wishlist', push: true,
    build: ({ count }) => ({
      title: 'Your wishlist is waiting',
      body: `You've saved ${count} ${count === 1 ? 'item' : 'items'}. Take another look before they're gone.`,
      screen: 'wishlist',
      collapseKey: 'wishlist_weekly',
    }),
  },
  wishlist_out_of_stock: {
    audience: 'customer', pushClass: 'transactional', channel: 'wishlist', push: false,
    build: ({ productId, variantId, productName }) => ({
      title: 'Out of stock',
      body: `${productName} from your wishlist is out of stock right now. We'll let you know when it's back.`,
      screen: 'product',
      targetId: productId,
      variantId,
      dataTitle: productName,
      referenceType: 'product',
      referenceId: productId,
    }),
  },
  back_in_stock: {
    audience: 'customer', pushClass: 'transactional', channel: 'wishlist', push: true,
    build: ({ productId, variantId, productName, imageUrl }) => ({
      title: 'Back in stock!',
      body: `${productName} is available again. Don't miss it this time.`,
      screen: 'product',
      targetId: productId,
      variantId,
      dataTitle: productName,
      referenceType: 'product',
      referenceId: productId,
      imageUrl,
      collapseKey: `back_in_stock:${productId}`,
    }),
  },
  offer_upcoming: {
    audience: 'customer', pushClass: 'promotional', channel: 'offers', push: true,
    build: ({ offerId, offerTitle }) => ({
      title: 'Big sale alert!',
      body: `${offerTitle} starts tomorrow. Get your wishlist ready.`,
      screen: 'offers',
      targetId: String(offerId),
      dataTitle: offerTitle,
      referenceType: 'offer',
      referenceId: String(offerId),
      collapseKey: `offer:${offerId}`,
    }),
  },
  offer_live: {
    audience: 'customer', pushClass: 'promotional', channel: 'offers', push: true,
    build: ({ offerId, offerTitle, endsAt }) => ({
      title: `${offerTitle} is LIVE!`,
      body: 'Limited time only. Shop now.',
      screen: 'offers',
      targetId: String(offerId),
      dataTitle: offerTitle,
      referenceType: 'offer',
      referenceId: String(offerId),
      collapseKey: `offer:${offerId}`,
      expiresAt: endsAt,
    }),
  },
  offer_join: {
    audience: 'seller', pushClass: 'promotional', channel: 'offers', push: true,
    build: ({ offerId, offerTitle, description }) => ({
      title: `Join ${offerTitle}!`,
      body: description ?? 'Create special deals and boost your sales.',
      screen: 'offer_detail',
      targetId: String(offerId),
      dataTitle: offerTitle,
      referenceType: 'offer',
      referenceId: String(offerId),
    }),
  },
  first_product_nudge: {
    audience: 'seller', pushClass: 'promotional', channel: 'seller_updates', push: true,
    build: () => ({
      title: 'Ready to start selling?',
      body: 'Upload your first product in 3 easy steps.',
      screen: 'add_product',
    }),
  },
  kyc_pending: {
    audience: 'seller', pushClass: 'transactional', channel: 'transactional', push: true,
    build: () => ({
      title: 'Complete your KYC',
      body: 'Verify your account to start selling on Loccalo.',
      screen: 'kyc',
      collapseKey: 'kyc_pending',
    }),
  },
  kyc_verified: {
    audience: 'seller', pushClass: 'transactional', channel: 'transactional', push: true,
    build: () => ({
      title: 'Your KYC verification is complete',
      body: 'Congratulations! Your seller account is now verified on Loccalo.',
      screen: 'dashboard',
    }),
  },
  kyc_revoked: {
    audience: 'seller', pushClass: 'transactional', channel: 'transactional', push: true,
    build: () => ({
      title: 'Your KYC verification has been revoked',
      body: 'Please contact support or re-submit your KYC documents.',
      screen: 'kyc',
    }),
  },
  views_milestone: {
    audience: 'seller', pushClass: 'transactional', channel: 'seller_updates', push: true,
    build: ({ productId, productName, milestone }) => ({
      title: 'Your product is trending!',
      body: `${productName} just hit ${formatViews(milestone)} views. Keep the momentum going!`,
      screen: 'product',
      targetId: productId,
      dataTitle: productName,
      referenceType: 'product',
      referenceId: productId,
    }),
  },
  out_of_stock_digest: {
    audience: 'seller', pushClass: 'transactional', channel: 'seller_updates', push: true,
    build: ({ count }) => ({
      title: `${count} products are out of stock`,
      body: 'Restock them so customers can find them again.',
      screen: 'products',
      // count is read back by the next digest to decide whether anything new went out of stock.
      params: { filter: 'outOfStock', count: String(count) },
      collapseKey: 'out_of_stock_digest',
    }),
  },
  seller_inactive: {
    audience: 'seller', pushClass: 'promotional', channel: 'seller_updates', push: true,
    build: () => ({
      title: 'We miss you!',
      body: 'Keep your catalogue fresh and stay connected with your customers.',
      screen: 'dashboard',
    }),
  },
  boost_suggestion: {
    audience: 'seller', pushClass: 'promotional', channel: 'offers', push: true,
    build: () => ({
      title: 'Get more eyes on your products',
      body: 'Boost a product to increase visibility and sales.',
      screen: 'boost_create',
    }),
  },
  boost_completed: {
    audience: 'seller', pushClass: 'transactional', channel: 'transactional', push: true,
    build: ({ boostId, productName }) => ({
      title: 'Your boost went viral!',
      body: `${productName} reached its target views. Boost again to reach more customers.`,
      screen: 'boost_detail',
      targetId: boostId,
      dataTitle: productName,
      referenceType: 'boost',
      referenceId: boostId,
    }),
  },
  boost_paid: {
    audience: 'seller', pushClass: 'transactional', channel: 'transactional', push: true,
    build: ({ boostId, productName, amount }) => ({
      title: 'Boost payment successful',
      body: `Payment of ₹${amount} received. Your boost for ${productName} is now live.`,
      screen: 'boost_detail',
      targetId: boostId,
      dataTitle: productName,
      referenceType: 'boost',
      referenceId: boostId,
    }),
  },
  share_shop: {
    audience: 'seller', pushClass: 'promotional', channel: 'seller_updates', push: true,
    build: () => ({
      title: 'Share your shop!',
      body: 'Your new products are live. Share your shop link so more customers find you.',
      screen: 'share_shop',
    }),
  },
  closing_soon: {
    audience: 'seller', pushClass: 'transactional', channel: 'seller_updates', push: true,
    build: () => ({
      title: 'Shop Closing Soon',
      body: 'Your shop is approaching closing time. Would you like to extend your shop hours for today?',
      screen: 'special_hours',
      collapseKey: 'closing_soon',
    }),
  },
  upload_limit_90: {
    audience: 'seller', pushClass: 'transactional', channel: 'seller_updates', push: true,
    build: ({ categoryName, used, limit }) => ({
      title: `You’ve used 90% of your ${categoryName} limit`,
      body: `${used} of ${limit} listings used — ${Math.max(0, limit - used)} left in ${categoryName}.`,
      screen: 'dashboard',
    }),
  },
  upload_limit_100: {
    audience: 'seller', pushClass: 'transactional', channel: 'seller_updates', push: false,
    build: ({ categoryName, used, limit }) => ({
      title: `You’ve reached your ${categoryName} limit`,
      body: `${used} of ${limit} listings used. Contact Loccalo admin to add more in ${categoryName}.`,
      screen: 'dashboard',
    }),
  },
  buy_storage: {
    audience: 'seller', pushClass: 'promotional', channel: 'offers', push: true,
    build: () => ({
      title: 'Need more space for your products?',
      body: 'Buy additional storage to showcase more products.',
      screen: 'dashboard',
    }),
  },
  account_deleted: {
    audience: 'seller', pushClass: 'transactional', channel: 'transactional', push: false,
    build: ({ recoveryDays }) => ({
      title: 'Your seller account has been deleted',
      body: `Log in again within ${recoveryDays} days to restore your account.`,
      screen: 'dashboard',
    }),
  },
};

export const OFFER_NOTIFICATION_TYPES: readonly string[] = ['offer', 'offer_upcoming', 'offer_live', 'offer_join'];

export const PROMOTIONAL_TYPES: readonly NotificationType[] = (Object.keys(TEMPLATES) as NotificationType[])
  .filter((type) => TEMPLATES[type].pushClass === 'promotional');
