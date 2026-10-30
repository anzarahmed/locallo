import type { EmailContent } from '../../utils/emailTemplates/sellerEmailLayout';
import type { NotificationSettings } from '../../types';
import { registrationCompleteEmail } from '../../utils/emailTemplates/seller/registrationCompleteEmail';
import { newJourneyEmail } from '../../utils/emailTemplates/seller/newJourneyEmail';
import { startUploadingEmail } from '../../utils/emailTemplates/seller/startUploadingEmail';
import { uploadGuideEmail } from '../../utils/emailTemplates/seller/uploadGuideEmail';
import { completeKycEmail } from '../../utils/emailTemplates/seller/completeKycEmail';
import { viewsMilestoneEmail } from '../../utils/emailTemplates/seller/viewsMilestoneEmail';
import { uploadLimitReachedEmail } from '../../utils/emailTemplates/seller/uploadLimitReachedEmail';
import { uploadLimitFullEmail } from '../../utils/emailTemplates/seller/uploadLimitFullEmail';
import { buyStorageEmail } from '../../utils/emailTemplates/seller/buyStorageEmail';
import { outOfStockEmail } from '../../utils/emailTemplates/seller/outOfStockEmail';
import { inactiveSellerEmail } from '../../utils/emailTemplates/seller/inactiveSellerEmail';
import { boostSuggestionEmail } from '../../utils/emailTemplates/seller/boostSuggestionEmail';
import { boostTargetReachedEmail } from '../../utils/emailTemplates/seller/boostTargetReachedEmail';
import { boostPaymentReceivedEmail } from '../../utils/emailTemplates/seller/boostPaymentReceivedEmail';
import { accountDeletedEmail } from '../../utils/emailTemplates/seller/accountDeletedEmail';
import { shareShopEmail } from '../../utils/emailTemplates/seller/shareShopEmail';
import type { SellerRecipient } from './sellerRecipients';
import type { NotificationType, TemplateParamsMap } from './templates';

// 'always' = transactional; promotional emails follow the seller's "Email updates" toggle.
export type SellerEmailGate = 'always' | keyof Pick<NotificationSettings, 'emailUpdates'>;

export interface SellerEmailTemplate<P> {
  gate: SellerEmailGate;
  build: (params: P, sellerName: string, recipient: SellerRecipient) => EmailContent;
}

type SellerEmailRegistry = Partial<{ [K in NotificationType]: SellerEmailTemplate<TemplateParamsMap[K]> }>;

// offer_join is absent on purpose: the offer outbox (offerNotificationJob) sends that email.
// closing_soon is push-only by spec.
export const SELLER_EMAILS: SellerEmailRegistry = {
  seller_registered: { gate: 'always', build: (_, name) => registrationCompleteEmail(name) },
  welcome_seller: { gate: 'always', build: (_, name) => newJourneyEmail(name) },
  first_product_nudge: {
    gate: 'emailUpdates',
    build: ({ reminder }, name) => (reminder === 1 ? startUploadingEmail(name) : uploadGuideEmail(name)),
  },
  kyc_pending: { gate: 'always', build: (_, name) => completeKycEmail(name) },
  views_milestone: {
    gate: 'always',
    build: ({ productId, productName, milestone }, name) => viewsMilestoneEmail(name, productId, productName, milestone),
  },
  upload_limit_90: {
    gate: 'always',
    build: ({ categoryName, used, limit }, name) => uploadLimitReachedEmail(name, categoryName, used, limit),
  },
  upload_limit_100: {
    gate: 'always',
    build: ({ categoryName, used, limit }, name) => uploadLimitFullEmail(name, categoryName, used, limit),
  },
  buy_storage: { gate: 'emailUpdates', build: (_, name) => buyStorageEmail(name) },
  out_of_stock_digest: { gate: 'always', build: (_, name) => outOfStockEmail(name) },
  seller_inactive: { gate: 'emailUpdates', build: (_, name) => inactiveSellerEmail(name) },
  boost_suggestion: { gate: 'emailUpdates', build: (_, name) => boostSuggestionEmail(name) },
  boost_completed: {
    gate: 'always',
    build: ({ productId, productName, target }, name) => boostTargetReachedEmail(name, productId, productName, target),
  },
  boost_paid: {
    gate: 'always',
    build: ({ productName, amount, transactionId, campaign }, name) =>
      boostPaymentReceivedEmail(name, { productName, amount, transactionId, campaign }),
  },
  share_shop: {
    gate: 'emailUpdates',
    build: (_, name, { userId, businessName }) => shareShopEmail(name, userId, businessName ?? name),
  },
  account_deleted: { gate: 'always', build: ({ recoveryDays }, name) => accountDeletedEmail(name, recoveryDays) },
};

export function getSellerEmailTemplate<T extends NotificationType>(type: T): SellerEmailTemplate<TemplateParamsMap[T]> | undefined {
  return SELLER_EMAILS[type] as SellerEmailTemplate<TemplateParamsMap[T]> | undefined;
}

export function isEmailGateOpen(gate: SellerEmailGate, settings: Partial<NotificationSettings>): boolean {
  return gate === 'always' || settings[gate] === true;
}
