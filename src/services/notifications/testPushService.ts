import crypto from 'crypto';
import { Op } from 'sequelize';
import { Notification } from '../../models/Notification';
import { Offer } from '../../models/Offer';
import { Product } from '../../models/Product';
import { ProductBoost } from '../../models/ProductBoost';
import { Session } from '../../models/Session';
import { Wishlist } from '../../models/Wishlist';
import { getPresignedUrlOrNull } from '../../utils/imageStorage';
import { isPushConfigured, sendPushToTokens } from '../../utils/push';
import type { TokenOutcome } from '../../utils/push';
import { countUnreadNotifications } from '../customer/notificationService';
import { buildNotificationRow } from './notifyService';
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

async function sampleBoost(userId: string): Promise<{ boostId: string; productName: string; amount: number }> {
  const boost = await ProductBoost.findOne({ where: { sellerId: userId }, order: [['createdAt', 'DESC']] });
  if (!boost) return { boostId: FALLBACK_ID, productName: 'Sample Product', amount: 99 };
  return { boostId: boost.id, productName: boost.productName ?? 'Sample Product', amount: Number(boost.amount) };
}

const SAMPLE_PARAMS: SampleBuilders = {
  welcome_customer: async () => ({}),
  welcome_seller: async () => ({}),
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
  first_product_nudge: async () => ({}),
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
    const { boostId, productName } = await sampleBoost(userId);
    return { boostId, productName };
  },
  boost_paid: sampleBoost,
  share_shop: async () => ({}),
  closing_soon: async () => ({ closeTime: '21:00' }),
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
  const results = await sendPushToTokens(tokens, {
    title: row.title,
    body: row.message,
    data: row.data,
    badge,
    options: row.pushOptions,
  });

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
    devices: results.map((r) => ({
      tokenSuffix: r.token.slice(-8),
      outcome: r.outcome,
      ...(r.error ? { error: r.error } : {}),
    })),
  };
}
