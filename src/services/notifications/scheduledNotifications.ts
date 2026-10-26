import { Op, QueryTypes } from 'sequelize';
import sequelize from '../../config/database';
import { Offer } from '../../models/Offer';
import { User } from '../../models/User';
import { SellerProfile } from '../../models/SellerProfile';
import { Wishlist } from '../../models/Wishlist';
import { hasVisibleVariantsSql, inStockSql } from '../customer/productService';
import { resolveTodayWorkingHours } from '../customer/sellerService';
import { getPresignedUrlOrNull } from '../../utils/imageStorage';
import { getIstDateString, getIstStartOfDay, getIstTimeString } from '../../utils/istDate';
import type { CustomDayOverride, WorkingHours } from '../../types';
import { notify, notifyMany } from './notifyService';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const VIEW_MILESTONES = [500, 1000, 10000, 100000];
export const OUT_OF_STOCK_DIGEST_THRESHOLD = 10;
const START_UPLOADING_DELAY_MS = 60 * 1000;
const BOOST_SUGGESTION_INTERVAL_DAYS = 15;
const RESTOCK_NOTIFY_COOLDOWN_DAYS = 7;
const CLOSING_REMINDER_LEAD_MINUTES = 10;
const OFFER_LIVE_WINDOW_MS = HOUR_MS;

const PRODUCT_IN_STOCK_SQL = inStockSql('p.id', 'p.stock');
const PRODUCT_HAS_VISIBLE_VARIANTS_SQL = hasVisibleVariantsSql('p.id');

// A wishlist row pinned to a variant follows that variant; otherwise the product's stock.
const WISHLIST_IN_STOCK_SQL = `(p.is_active AND CASE
    WHEN w.variant_id IS NOT NULL THEN COALESCE(v.is_active AND v.stock > 0, false)
    ELSE ${PRODUCT_IN_STOCK_SQL}
  END)`;

const WISHLIST_VISIBLE_SQL = `(p.is_active AND CASE
    WHEN w.variant_id IS NOT NULL THEN COALESCE(v.is_active, false)
    ELSE ${PRODUCT_HAS_VISIBLE_VARIANTS_SQL}
  END)`;

async function selectIds(sql: string, replacements: Record<string, unknown> = {}): Promise<string[]> {
  const rows = await sequelize.query<{ id: string }>(sql, { replacements, type: QueryTypes.SELECT });
  return rows.map((r) => r.id);
}

async function activeCustomerIds(): Promise<string[]> {
  const users = await User.findAll({
    where: { role: 'CUSTOMER', isActive: true, isVerified: true },
    attributes: ['id'],
  });
  return users.map((u) => u.id);
}

export async function sendProfileReminders(now: Date = new Date()): Promise<void> {
  const ids = await selectIds(
    `SELECT id FROM users
      WHERE role = 'CUSTOMER' AND is_active = true
        AND first_login_at BETWEEN :from AND :to
        AND (full_name IS NULL OR email IS NULL OR date_of_birth IS NULL OR gender IS NULL)`,
    { from: new Date(now.getTime() - 3 * DAY_MS), to: new Date(now.getTime() - DAY_MS) },
  );
  await notifyMany(ids, 'profile_incomplete', {}, (id) => `profile_incomplete:${id}`);
}

async function sendFirstProductNudge(reminder: 1 | 2, from: Date, to: Date): Promise<void> {
  const ids = await selectIds(
    `SELECT u.id FROM users u
      WHERE u.role = 'SELLER' AND u.is_active = true
        AND u.first_login_at BETWEEN :from AND :to
        AND NOT EXISTS (SELECT 1 FROM products p WHERE p.seller_id = u.id)`,
    { from, to },
  );
  await notifyMany(ids, 'first_product_nudge', { reminder }, (id) => `first_product_nudge:${id}:${reminder}`);
}

// The window runs a day past the lead time so a missed tick still reaches the seller; the dedupe key stops repeats.
export async function sendStartUploadingNudges(now: Date = new Date()): Promise<void> {
  await sendFirstProductNudge(1, new Date(now.getTime() - DAY_MS), new Date(now.getTime() - START_UPLOADING_DELAY_MS));
}

export async function sendUploadGuideNudges(now: Date = new Date()): Promise<void> {
  await sendFirstProductNudge(2, new Date(now.getTime() - 2 * DAY_MS), new Date(now.getTime() - DAY_MS));
}

export async function sendOfferLiveNotifications(now: Date = new Date()): Promise<void> {
  const offers = await Offer.findAll({
    where: {
      isActive: true,
      startDate: { [Op.lte]: now, [Op.gt]: new Date(now.getTime() - OFFER_LIVE_WINDOW_MS) },
      endDate: { [Op.gt]: now },
    },
  });
  if (offers.length === 0) return;

  const customerIds = await activeCustomerIds();
  for (const offer of offers) {
    await notifyMany(
      customerIds,
      'offer_live',
      { offerId: offer.id, offerTitle: offer.title, endsAt: offer.endDate },
      (id) => `offer_live:${offer.id}:${id}`,
    );
  }
}

export async function sendOfferUpcomingNotifications(now: Date = new Date()): Promise<void> {
  const tomorrowStart = new Date(getIstStartOfDay(now).getTime() + DAY_MS);
  const offers = await Offer.findAll({
    where: {
      isActive: true,
      startDate: { [Op.gte]: tomorrowStart, [Op.lt]: new Date(tomorrowStart.getTime() + DAY_MS) },
    },
  });
  // An offer announced less than a day ahead would get "tomorrow" and "live" back to back.
  const upcoming = offers.filter((o) => o.startDate.getTime() - o.createdAt.getTime() >= DAY_MS);
  if (upcoming.length === 0) return;

  const customerIds = await activeCustomerIds();
  for (const offer of upcoming) {
    await notifyMany(
      customerIds,
      'offer_upcoming',
      { offerId: offer.id, offerTitle: offer.title },
      (id) => `offer_upcoming:${offer.id}:${id}`,
    );
  }
}

export async function sendWishlistWeekly(now: Date = new Date()): Promise<void> {
  const rows = await sequelize.query<{ customer_id: string; count: number }>(
    `SELECT w.customer_id, COUNT(*)::int AS count
       FROM wishlists w
       JOIN users u ON u.id = w.customer_id AND u.is_active = true
       JOIN products p ON p.id = w.product_id
       LEFT JOIN product_variants v ON v.id = w.variant_id
      WHERE w.created_at <= :savedBefore AND ${WISHLIST_IN_STOCK_SQL}
      GROUP BY w.customer_id`,
    { replacements: { savedBefore: new Date(now.getTime() - 7 * DAY_MS) }, type: QueryTypes.SELECT },
  );

  const week = getIstDateString(now);
  const byCount = new Map<number, string[]>();
  for (const { customer_id, count } of rows) {
    byCount.set(count, [...(byCount.get(count) ?? []), customer_id]);
  }
  for (const [count, ids] of byCount) {
    await notifyMany(ids, 'wishlist_weekly', { count }, (id) => `wishlist_weekly:${id}:${week}`);
  }
}

interface WishlistStockRow {
  id: string;
  customer_id: string;
  product_id: string;
  variant_id: string | null;
  in_stock: boolean | null;
  restock_notified_at: Date | null;
  name: string;
  product_images: string[] | null;
  variant_images: string[] | null;
  now_in_stock: boolean;
  visible: boolean;
}

// Compares each wishlist row's last seen stock state with the current one, so every
// stock path (sales, purchases, edits, variant toggles) is covered without hooks.
export async function syncWishlistStock(now: Date = new Date()): Promise<void> {
  const rows = await sequelize.query<WishlistStockRow>(
    `SELECT w.id, w.customer_id, w.product_id, w.variant_id, w.in_stock, w.restock_notified_at,
            p.name, p.images AS product_images, v.images AS variant_images,
            ${WISHLIST_IN_STOCK_SQL} AS now_in_stock,
            ${WISHLIST_VISIBLE_SQL} AS visible
       FROM wishlists w
       JOIN products p ON p.id = w.product_id
       LEFT JOIN product_variants v ON v.id = w.variant_id
      WHERE w.in_stock IS DISTINCT FROM ${WISHLIST_IN_STOCK_SQL}`,
    { type: QueryTypes.SELECT },
  );
  if (rows.length === 0) return;

  const day = getIstDateString(now);
  const cooldownStart = now.getTime() - RESTOCK_NOTIFY_COOLDOWN_DAYS * DAY_MS;
  const restockNotified: string[] = [];

  for (const row of rows) {
    if (row.in_stock === null) continue;
    const variantId = row.variant_id ?? undefined;

    if (row.now_in_stock) {
      if (row.restock_notified_at && row.restock_notified_at.getTime() > cooldownStart) continue;
      const imageKey = row.variant_images?.[0] ?? row.product_images?.[0] ?? null;
      await notify(
        row.customer_id,
        'back_in_stock',
        {
          productId: row.product_id,
          variantId,
          productName: row.name,
          imageUrl: (await getPresignedUrlOrNull(imageKey)) ?? undefined,
        },
        { dedupeKey: `back_in_stock:${row.id}:${day}` },
      );
      restockNotified.push(row.id);
    } else if (row.visible) {
      // A product or variant the seller hid isn't out of stock, and its link would 404.
      await notify(
        row.customer_id,
        'wishlist_out_of_stock',
        { productId: row.product_id, variantId, productName: row.name },
        { dedupeKey: `wishlist_out_of_stock:${row.id}:${day}` },
      );
    }
  }

  const nowInStock = rows.filter((r) => r.now_in_stock).map((r) => r.id);
  const nowOutOfStock = rows.filter((r) => !r.now_in_stock).map((r) => r.id);
  if (nowInStock.length > 0) await Wishlist.update({ inStock: true }, { where: { id: { [Op.in]: nowInStock } } });
  if (nowOutOfStock.length > 0) await Wishlist.update({ inStock: false }, { where: { id: { [Op.in]: nowOutOfStock } } });
  if (restockNotified.length > 0) {
    await Wishlist.update({ restockNotifiedAt: now }, { where: { id: { [Op.in]: restockNotified } } });
  }
}

export async function sendViewMilestones(): Promise<void> {
  const rows = await sequelize.query<{ product_id: string; seller_id: string; name: string; views: number }>(
    `SELECT p.id AS product_id, p.seller_id, p.name, COUNT(*)::int AS views
       FROM product_views pv
       JOIN products p ON p.id = pv.product_id AND p.is_active = true
      GROUP BY p.id, p.seller_id, p.name
     HAVING COUNT(*) >= :minimum`,
    { replacements: { minimum: VIEW_MILESTONES[0] }, type: QueryTypes.SELECT },
  );

  for (const row of rows) {
    // Only the highest milestone crossed is announced, so a product that jumps past
    // several between sweeps gets one push, not a burst.
    const milestone = [...VIEW_MILESTONES].reverse().find((m) => row.views >= m);
    if (!milestone) continue;
    await notify(
      row.seller_id,
      'views_milestone',
      { productId: row.product_id, productName: row.name, milestone },
      { dedupeKey: `views_milestone:${row.product_id}:${milestone}` },
    );
  }
}

export async function sendOutOfStockDigests(now: Date = new Date()): Promise<void> {
  const rows = await sequelize.query<{ seller_id: string; count: number; last_count: number | null }>(
    `SELECT p.seller_id, COUNT(*)::int AS count,
            (SELECT (n.data->>'count')::int FROM notifications n
              WHERE n.user_id = p.seller_id AND n.type = 'out_of_stock_digest'
              ORDER BY n.created_at DESC LIMIT 1) AS last_count
       FROM products p
       JOIN users u ON u.id = p.seller_id AND u.is_active = true
      WHERE p.is_active = true AND ${PRODUCT_HAS_VISIBLE_VARIANTS_SQL} AND NOT ${PRODUCT_IN_STOCK_SQL}
      GROUP BY p.seller_id
     HAVING COUNT(*) >= :threshold`,
    { replacements: { threshold: OUT_OF_STOCK_DIGEST_THRESHOLD }, type: QueryTypes.SELECT },
  );

  const day = getIstDateString(now);
  for (const row of rows) {
    if (row.last_count !== null && row.count <= row.last_count) continue;
    await notify(row.seller_id, 'out_of_stock_digest', { count: row.count }, { dedupeKey: `out_of_stock_digest:${row.seller_id}:${day}` });
  }
}

export async function sendInactivityReminders(now: Date = new Date()): Promise<void> {
  const rows = await sequelize.query<{ id: string; last_active_at: Date }>(
    `SELECT id, last_active_at FROM users
      WHERE role = 'SELLER' AND is_active = true AND last_active_at <= :cutoff`,
    { replacements: { cutoff: new Date(now.getTime() - 30 * DAY_MS) }, type: QueryTypes.SELECT },
  );

  for (const row of rows) {
    // Keyed on the inactivity spell, so a seller who comes back and lapses again is reminded again.
    // The ':30' suffix matches keys from the old 30/60-day stages, so nobody is re-sent on deploy.
    const spell = getIstDateString(row.last_active_at);
    await notify(row.id, 'seller_inactive', {}, { dedupeKey: `seller_inactive:${row.id}:${spell}:30` });
  }
}

export async function sendBoostSuggestions(now: Date = new Date()): Promise<void> {
  const ids = await selectIds(
    `SELECT u.id FROM users u
       JOIN seller_profiles sp ON sp.user_id = u.id AND sp.is_verified = true
      WHERE u.role = 'SELLER' AND u.is_active = true
        AND EXISTS (SELECT 1 FROM products p WHERE p.seller_id = u.id AND p.is_active = true AND ${PRODUCT_IN_STOCK_SQL})
        AND NOT EXISTS (
          SELECT 1 FROM product_boosts b
           WHERE b.seller_id = u.id
             AND (b.status IN ('active', 'pending') OR b.created_at > NOW() - make_interval(days => :days)))
        AND NOT EXISTS (
          SELECT 1 FROM notifications n
           WHERE n.user_id = u.id AND n.type = 'boost_suggestion'
             AND n.created_at > NOW() - make_interval(days => :days))`,
    { days: BOOST_SUGGESTION_INTERVAL_DAYS },
  );
  const day = getIstDateString(now);
  await notifyMany(ids, 'boost_suggestion', {}, (id) => `boost_suggestion:${id}:${day}`);
}

// Weeks are counted from each seller's registration date, and the key is per week rather
// than per day, so the daily sweep sends once a week and catches up if a run is missed.
export async function sendKycReminders(now: Date = new Date()): Promise<void> {
  const rows = await sequelize.query<{ id: string; week: number }>(
    `SELECT id, days_registered / 7 AS week FROM (
       SELECT u.id,
              ((:now::timestamptz AT TIME ZONE 'Asia/Kolkata')::date - (u.created_at AT TIME ZONE 'Asia/Kolkata')::date) AS days_registered
         FROM users u
         JOIN seller_profiles sp ON sp.user_id = u.id
        WHERE u.role = 'SELLER' AND u.is_active = true AND sp.is_verified = false
          AND (sp.kyc_documents->>'aadhar' IS NULL OR sp.kyc_documents->>'pan' IS NULL)
     ) pending
     WHERE days_registered >= 7`,
    { replacements: { now }, type: QueryTypes.SELECT },
  );
  const weekById = new Map(rows.map((r) => [r.id, r.week]));
  await notifyMany([...weekById.keys()], 'kyc_pending', {}, (id) => `kyc_pending:${id}:w${weekById.get(id)}`);
}

export async function sendShareShopReminders(now: Date = new Date()): Promise<void> {
  const ids = await selectIds(
    `SELECT u.id FROM users u
       JOIN seller_profiles sp ON sp.user_id = u.id AND sp.is_verified = true
      WHERE u.role = 'SELLER' AND u.is_active = true
        AND EXISTS (
          SELECT 1 FROM products p
           WHERE p.seller_id = u.id AND p.is_active = true AND p.created_at > NOW() - INTERVAL '30 days')`,
  );
  const month = getIstDateString(now).slice(0, 7);
  await notifyMany(ids, 'share_shop', {}, (id) => `share_shop:${id}:${month}`);
}

function minusMinutes(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  const total = Math.max(0, h * 60 + m - minutes);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export async function sendClosingReminders(now: Date = new Date()): Promise<void> {
  const profiles = await SellerProfile.findAll({
    where: { notificationSettings: { closingReminder: true } },
    attributes: ['userId', 'workingHours', 'customDayOverride'],
    include: [{ model: User, attributes: [], where: { isActive: true }, required: true }],
  });

  const currentTime = getIstTimeString(now);
  for (const profile of profiles) {
    const today = resolveTodayWorkingHours(
      profile.workingHours as WorkingHours,
      profile.customDayOverride as CustomDayOverride | null,
    );
    const { isClosed, close } = today.time ?? {};
    if (isClosed || !close) continue;
    // A window rather than an exact minute, so a delayed cron tick still sends it.
    if (currentTime < minusMinutes(close, CLOSING_REMINDER_LEAD_MINUTES) || currentTime >= close) continue;

    await notify(profile.userId, 'closing_soon', { closeTime: close }, { dedupeKey: `closing_soon:${profile.userId}:${today.date}` });
  }
}
