import crypto from 'crypto';
import { Op } from 'sequelize';
import { Notification } from '../../models/Notification';
import { Offer } from '../../models/Offer';
import { Product } from '../../models/Product';
import { ProductBoost } from '../../models/ProductBoost';
import { Session } from '../../models/Session';
import { Wishlist } from '../../models/Wishlist';
import { getSellerLimits } from '../seller/productLimitService';
import { getPresignedUrlOrNull } from '../../utils/imageStorage';
import { buildPushMessage, isPushConfigured, sendPushToTokens, toFcmWirePayload } from '../../utils/push';
import type { PushContent, TokenOutcome } from '../../utils/push';
import { countUnreadNotifications } from '../customer/notificationService';
import { buildNotificationRow } from './notifyService';
import { getSellerEmailTemplate } from './sellerEmails';
import { getSellerRecipient } from './sellerRecipients';
import type { SellerRecipient } from './sellerRecipients';
import { sendSellerEmail } from '../../utils/mailer';
import { offerManiaEmail } from '../../utils/emailTemplates/seller/offerManiaEmail';
import { boostPaymentFailedEmail } from '../../utils/emailTemplates/seller/boostPaymentFailedEmail';
import { kycVerificationEmail } from '../../utils/emailTemplates/seller/kycVerificationEmail';
import type { EmailContent } from '../../utils/emailTemplates/sellerEmailLayout';
import { TEMPLATES } from './templates';
import type { NotificationAudience, NotificationTemplate, NotificationType, TemplateParamsMap } from './templates';

type SampleBuilders = { [K in NotificationType]: (userId: string) => Promise<TemplateParamsMap[K]> };

interface SampleProduct {
  productId: string;
  productName: string;
  imageUrl?: string;
}

interface SampleOffer {
  offerId: number;
  offerTitle: string;
  description: string | null;
  endsAt: Date;
}

const FALLBACK_ID = '00000000-0000-0000-0000-000000000000';
const DAY_MS = 24 * 60 * 60 * 1000;

async function toSampleProduct(product: Product | null): Promise<SampleProduct> {
  if (!product) return { productId: FALLBACK_ID, productName: 'Sample Product' };
  const imageUrl = await getPresignedUrlOrNull(product.images?.[0]);
  return { productId: product.id, productName: product.name, ...(imageUrl ? { imageUrl } : {}) };
}

async function sampleCustomerProduct(userId: string): Promise<SampleProduct> {
  const wished = await Wishlist.findOne({ where: { customerId: userId }, order: [['createdAt', 'DESC']] });
  const product = wished
    ? await Product.findByPk(wished.productId)
    : await Product.findOne({ where: { isActive: true }, order: [['createdAt', 'DESC']] });
  return toSampleProduct(product);
}

async function sampleSellerProduct(userId: string): Promise<SampleProduct> {
  return toSampleProduct(await Product.findOne({ where: { sellerId: userId }, order: [['createdAt', 'DESC']] }));
}

async function sampleOffer(): Promise<SampleOffer> {
  const offer = await Offer.findOne({ order: [['createdAt', 'DESC']] });
  if (!offer) {
    return { offerId: 0, offerTitle: 'Sample Sale', description: null, endsAt: new Date(Date.now() + DAY_MS) };
  }
  // A past end date would make FCM drop the push (ttl 0), which defeats the test.
  const endsAt = offer.endDate.getTime() > Date.now() ? offer.endDate : new Date(Date.now() + DAY_MS);
  return { offerId: offer.id, offerTitle: offer.title, description: offer.description, endsAt };
}

interface SampleBoost {
  boostId: string;
  productId: string | null;
  productName: string;
  amount: number;
  target: number;
}

async function sampleBoost(userId: string): Promise<SampleBoost> {
  const boost = await ProductBoost.findOne({ where: { sellerId: userId }, order: [['createdAt', 'DESC']] });
  if (!boost) return { boostId: FALLBACK_ID, productId: null, productName: 'Sample Product', amount: 99, target: 2000 };
  return {
    boostId: boost.id,
    productId: boost.productId,
    productName: boost.productName ?? 'Sample Product',
    amount: Number(boost.amount),
    target: boost.estimatedImpressionsMax,
  };
}

const SAMPLE_PARAMS: SampleBuilders = {
  welcome_customer: async () => ({}),
  welcome_seller: async () => ({}),
  seller_registered: async () => ({}),
  profile_incomplete: async () => ({}),
  wishlist_weekly: async (userId) => ({ count: Math.max(1, await Wishlist.count({ where: { customerId: userId } })) }),
  wishlist_out_of_stock: async (userId) => {
    const { productId, productName } = await sampleCustomerProduct(userId);
    return { productId, productName };
  },
  back_in_stock: sampleCustomerProduct,
  offer_upcoming: async () => {
    const { offerId, offerTitle } = await sampleOffer();
    return { offerId, offerTitle };
  },
  offer_live: async () => {
    const { offerId, offerTitle, endsAt } = await sampleOffer();
    return { offerId, offerTitle, endsAt };
  },
  offer_join: async () => {
    const { offerId, offerTitle, description } = await sampleOffer();
    return { offerId, offerTitle, description };
  },
  first_product_nudge: async () => ({ reminder: 1 }),
  kyc_pending: async () => ({}),
  views_milestone: async (userId) => {
    const { productId, productName } = await sampleSellerProduct(userId);
    return { productId, productName, milestone: 1000 };
  },
  out_of_stock_digest: async (userId) => ({
    count: Math.max(1, await Product.count({ where: { sellerId: userId, stock: { [Op.lte]: 0 } } })),
  }),
  seller_inactive: async () => ({}),
  boost_suggestion: async () => ({}),
  boost_completed: async (userId) => {
    const { boostId, productId, productName, target } = await sampleBoost(userId);
    return { boostId, productId, productName, target };
  },
  boost_paid: async (userId) => {
    const { boostId, productName, amount } = await sampleBoost(userId);
    return { boostId, productName, amount, transactionId: 'pay_SAMPLE123456', campaign: 'Pan India' };
  },
  share_shop: async () => ({}),
  closing_soon: async () => ({}),
  upload_limit_90: async (userId) => {
    const [first] = await getSellerLimits(userId);
    return { categoryId: first?.categoryId ?? 0, categoryName: first?.categoryName ?? 'Fashion', used: 180, limit: 200 };
  },
  buy_storage: async () => ({}),
  account_deleted: async () => ({ recoveryDays: 60 }),
};

export interface TestPushTypeItem {
  type: NotificationType;
  title: string;
  body: string;
  screen: string;
  pushClass: string;
  channel: string;
  // false = production only writes an inbox row for this type; the test still pushes it.
  pushInProduction: boolean;
  hasEmail: boolean;
}

export interface TestPushDeviceResult {
  tokenSuffix: string;
  outcome: TokenOutcome;
  error?: string;
}

export interface TestPushResult {
  notificationId: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, string>;
  // Exactly what each device receives; only the token differs (see devices[].tokenSuffix).
  payload: { message: object };
  devices: TestPushDeviceResult[];
}

function typesFor(audience: NotificationAudience): NotificationType[] {
  return (Object.keys(TEMPLATES) as NotificationType[]).filter((type) => TEMPLATES[type].audience === audience);
}

async function buildFor<T extends NotificationType>(type: T, userId: string, overrides: Record<string, unknown>) {
  const template = TEMPLATES[type] as NotificationTemplate<TemplateParamsMap[T]>;
  const params = { ...(await SAMPLE_PARAMS[type](userId)), ...overrides } as TemplateParamsMap[T];
  if (type === 'offer_live' && typeof (params as { endsAt?: unknown }).endsAt === 'string') {
    (params as { endsAt: Date }).endsAt = new Date((params as unknown as { endsAt: string }).endsAt);
  }
  return { template, built: template.build(params) };
}

export async function listTestPushTypes(userId: string, audience: NotificationAudience): Promise<TestPushTypeItem[]> {
  return Promise.all(typesFor(audience).map(async (type) => {
    const { template, built } = await buildFor(type, userId, {});
    return {
      type,
      title: built.title,
      body: built.body,
      screen: built.screen,
      pushClass: template.pushClass,
      channel: template.channel,
      pushInProduction: template.push,
      hasEmail: audience === 'seller' && hasSellerEmail(type),
    };
  }));
}

// Deliberately bypasses settings, promo caps, quiet hours and dedupe keys, and sends
// synchronously so the caller sees FCM's verdict per device in the response.
export async function sendTestPush(
  userId: string,
  audience: NotificationAudience,
  type: NotificationType,
  overrides: Record<string, unknown> = {},
): Promise<TestPushResult> {
  const allowed = typesFor(audience);
  if (!allowed.includes(type)) {
    throw Object.assign(new Error(`"${type}" is not a ${audience} notification. Allowed: ${allowed.join(', ')}`), { status: 422 });
  }
  if (!isPushConfigured()) {
    throw Object.assign(new Error('FCM is not configured on this server (FIREBASE_* env vars missing)'), { status: 400 });
  }

  const now = new Date();
  const sessions = await Session.findAll({
    where: {
      actorType: 'user',
      actorId: userId,
      pushToken: { [Op.ne]: null },
      [Op.or]: [{ expiresAt: null }, { expiresAt: { [Op.gt]: now } }],
    },
    attributes: ['pushToken'],
  });
  const tokens = sessions.map((s) => s.pushToken).filter((t): t is string => Boolean(t));
  if (tokens.length === 0) {
    throw Object.assign(new Error('No push token registered for this account — call PUT /push-token first'), { status: 404 });
  }

  const { template, built } = await buildFor(type, userId, overrides);
  const id = crypto.randomUUID();
  const row = buildNotificationRow(id, userId, type, template, built);

  // 'skipped' keeps pushDispatchJob from claiming the row and sending it a second time.
  await Notification.create({ ...row, dedupeKey: null, pushStatus: 'skipped', sendAfter: null });

  const badge = await countUnreadNotifications(userId);
  const content: PushContent = {
    title: row.title,
    body: row.message,
    data: row.data,
    badge,
    options: row.pushOptions,
  };
  const results = await sendPushToTokens(tokens, content);

  const invalidTokens = results.filter((r) => r.outcome === 'invalid_token').map((r) => r.token);
  if (invalidTokens.length > 0) {
    await Session.update({ pushToken: null, pushTokenUpdatedAt: now }, { where: { pushToken: { [Op.in]: invalidTokens } } });
  }

  const sent = results.some((r) => r.outcome === 'sent');
  await Notification.update({
    pushStatus: sent ? 'sent' : 'failed',
    pushSentAt: sent ? now : null,
    pushAttempts: 1,
    pushLastError: results.find((r) => r.error)?.error ?? null,
  }, { where: { id } });

  return {
    notificationId: id,
    type,
    title: row.title,
    body: row.message,
    data: row.data,
    payload: toFcmWirePayload(buildPushMessage('<device token>', content)),
    devices: results.map((r) => ({
      tokenSuffix: r.token.slice(-8),
      outcome: r.outcome,
      ...(r.error ? { error: r.error } : {}),
    })),
  };
}

// Emails sent outside the notification pipeline (direct sendSellerEmail calls), so they have no NotificationType.
const DIRECT_EMAIL_TYPES = ['boost_payment_failed', 'kyc_verified', 'kyc_revoked'] as const;
type DirectEmailType = typeof DIRECT_EMAIL_TYPES[number];
export type TestEmailType = NotificationType | DirectEmailType;

function hasSellerEmail(type: NotificationType): boolean {
  return type === 'offer_join' || Boolean(getSellerEmailTemplate(type));
}

export const TEST_EMAIL_TYPES: TestEmailType[] = [
  ...(Object.keys(TEMPLATES) as NotificationType[]).filter((type) => TEMPLATES[type].audience === 'seller' && hasSellerEmail(type)),
  ...DIRECT_EMAIL_TYPES,
];

// first_product_nudge renders a different template per reminder, so send-all covers both.
interface TestEmailCase {
  type: TestEmailType;
  params: Record<string, unknown>;
}

const ALL_EMAIL_CASES: TestEmailCase[] = TEST_EMAIL_TYPES.flatMap((type): TestEmailCase[] =>
  type === 'first_product_nudge'
    ? [{ type, params: { reminder: 1 } }, { type, params: { reminder: 2 } }]
    : [{ type, params: {} }]);

function isDirectEmailType(type: TestEmailType): type is DirectEmailType {
  return (DIRECT_EMAIL_TYPES as readonly string[]).includes(type);
}

export interface TestEmailResult {
  type: TestEmailType;
  to: string;
  subject: string;
}

export interface TestEmailTypeItem {
  type: TestEmailType;
  params?: Record<string, unknown>;
  subject: string;
}

export interface TestEmailBatchItem {
  type: TestEmailType;
  params: Record<string, unknown>;
  subject: string | null;
  outcome: 'sent' | 'failed';
  error?: string;
}

export interface TestEmailBatchResult {
  to: string;
  sent: number;
  failed: number;
  emails: TestEmailBatchItem[];
}

async function buildDirectTestEmail(
  type: DirectEmailType,
  userId: string,
  recipient: SellerRecipient,
  overrides: Record<string, unknown>,
): Promise<EmailContent> {
  if (type === 'boost_payment_failed') {
    const { productName, amount } = await sampleBoost(userId);
    const params = { productName, amount, ...overrides } as { productName: string; amount: number };
    return boostPaymentFailedEmail(recipient.name, params.productName, Number(params.amount));
  }
  const businessName = typeof overrides.businessName === 'string' ? overrides.businessName : recipient.businessName ?? 'Sample Shop';
  return kycVerificationEmail(recipient.name, businessName, type === 'kyc_verified');
}

async function buildTestEmail<T extends NotificationType>(
  type: T | DirectEmailType,
  userId: string,
  recipient: SellerRecipient,
  overrides: Record<string, unknown>,
): Promise<EmailContent | null> {
  if (isDirectEmailType(type)) return buildDirectTestEmail(type, userId, recipient, overrides);
  const params = { ...(await SAMPLE_PARAMS[type](userId)), ...overrides } as TemplateParamsMap[T];
  // offer_join's email is sent by the offer outbox, not the notification pipeline.
  if (type === 'offer_join') return offerManiaEmail(recipient.name, (params as TemplateParamsMap['offer_join']).offerId);
  return getSellerEmailTemplate(type)?.build(params, recipient.name, recipient) ?? null;
}

async function requireEmailRecipient(userId: string): Promise<SellerRecipient & { email: string }> {
  const recipient = await getSellerRecipient(userId);
  if (!recipient?.email) {
    throw Object.assign(new Error('No email address on this seller account'), { status: 404 });
  }
  return recipient as SellerRecipient & { email: string };
}

export async function listTestEmailTypes(userId: string): Promise<TestEmailTypeItem[]> {
  const recipient = (await getSellerRecipient(userId)) ?? { userId, email: null, name: 'Seller', businessName: null, settings: {} };
  return Promise.all(ALL_EMAIL_CASES.map(async ({ type, params }) => ({
    type,
    ...(Object.keys(params).length > 0 ? { params } : {}),
    subject: (await buildTestEmail(type, userId, recipient, params))?.subject ?? '',
  })));
}

// Sends straight to the caller's own email, bypassing the seller's email settings.
export async function sendTestEmail(
  userId: string,
  type: TestEmailType,
  overrides: Record<string, unknown> = {},
): Promise<TestEmailResult> {
  const recipient = await requireEmailRecipient(userId);
  const content = await buildTestEmail(type, userId, recipient, overrides);
  if (!content) {
    throw Object.assign(new Error(`"${type}" has no seller email. Allowed: ${TEST_EMAIL_TYPES.join(', ')}`), { status: 422 });
  }

  await sendSellerEmail(recipient.email, content);
  return { type, to: recipient.email, subject: content.subject };
}

// Sequential on purpose: Gmail SMTP throttles bursts of parallel sends from one account.
export async function sendAllTestEmails(userId: string): Promise<TestEmailBatchResult> {
  const recipient = await requireEmailRecipient(userId);
  const emails: TestEmailBatchItem[] = [];
  for (const { type, params } of ALL_EMAIL_CASES) {
    let subject: string | null = null;
    try {
      const content = await buildTestEmail(type, userId, recipient, params);
      if (!content) throw new Error('No email template');
      subject = content.subject;
      await sendSellerEmail(recipient.email, content);
      emails.push({ type, params, subject, outcome: 'sent' });
    } catch (err: unknown) {
      emails.push({ type, params, subject, outcome: 'failed', error: err instanceof Error ? err.message : String(err) });
    }
  }
  const sent = emails.filter((e) => e.outcome === 'sent').length;
  return { to: recipient.email, sent, failed: emails.length - sent, emails };
}
