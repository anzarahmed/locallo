// TEMP: remove after email frequency QA, along with its hooks in notificationSchedulerJob.ts
// and middleware/auth.ts. Fast copies of sendKycReminders, sendInactivityReminders and
// sendBoostSuggestions, limited to EMAIL_FREQ_TEST_SELLER_IDS. The 'test:' dedupe prefix
// keeps these rows from ever colliding with the real keys.
import { QueryTypes } from 'sequelize';
import sequelize from '../../config/database';
import { inStockSql } from '../customer/productService';
import { notifyMany } from './notifyService';

const MINUTE_MS = 60 * 1000;
const KYC_INTERVAL_MINUTES = 7;
const INACTIVE_INTERVAL_MINUTES = 10;
const BOOST_INTERVAL_MINUTES = 15;

const TEST_SELLER_IDS = (process.env.EMAIL_FREQ_TEST_SELLER_IDS ?? '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);

export const EMAIL_FREQ_TEST_ON = TEST_SELLER_IDS.length > 0;

const PRODUCT_IN_STOCK_SQL = inStockSql('p.id', 'p.stock');

function bucket(now: Date, minutes: number): number {
  return Math.floor(now.getTime() / (minutes * MINUTE_MS));
}

async function selectTestSellerIds(sql: string, replacements: Record<string, unknown>): Promise<string[]> {
  const rows = await sequelize.query<{ id: string }>(sql, {
    replacements: { ...replacements, ids: TEST_SELLER_IDS },
    type: QueryTypes.SELECT,
  });
  return rows.map((r) => r.id);
}

export async function sendKycRemindersTest(now: Date = new Date()): Promise<void> {
  const ids = await selectTestSellerIds(
    `SELECT u.id FROM users u
       JOIN seller_profiles sp ON sp.user_id = u.id
      WHERE u.id IN (:ids) AND u.role = 'SELLER' AND u.is_active = true AND sp.is_verified = false
        AND (sp.kyc_documents->>'aadhar' IS NULL OR sp.kyc_documents->>'pan' IS NULL)
        AND u.created_at <= :cutoff`,
    { cutoff: new Date(now.getTime() - KYC_INTERVAL_MINUTES * MINUTE_MS) },
  );
  const slot = bucket(now, KYC_INTERVAL_MINUTES);
  await notifyMany(ids, 'kyc_pending', {}, (id) => `test:kyc_pending:${id}:${slot}`);
}

export async function sendInactivityRemindersTest(now: Date = new Date()): Promise<void> {
  const ids = await selectTestSellerIds(
    `SELECT u.id FROM users u
      WHERE u.id IN (:ids) AND u.role = 'SELLER' AND u.is_active = true
        AND u.last_active_at <= :cutoff`,
    { cutoff: new Date(now.getTime() - INACTIVE_INTERVAL_MINUTES * MINUTE_MS) },
  );
  const slot = bucket(now, INACTIVE_INTERVAL_MINUTES);
  await notifyMany(ids, 'seller_inactive', {}, (id) => `test:seller_inactive:${id}:${slot}`);
}

export async function sendBoostSuggestionsTest(now: Date = new Date()): Promise<void> {
  const ids = await selectTestSellerIds(
    `SELECT u.id FROM users u
       JOIN seller_profiles sp ON sp.user_id = u.id AND sp.is_verified = true
      WHERE u.id IN (:ids) AND u.role = 'SELLER' AND u.is_active = true
        AND EXISTS (SELECT 1 FROM products p WHERE p.seller_id = u.id AND p.is_active = true AND ${PRODUCT_IN_STOCK_SQL})
        AND NOT EXISTS (
          SELECT 1 FROM product_boosts b
           WHERE b.seller_id = u.id
             AND (b.status IN ('active', 'pending') OR b.created_at > NOW() - make_interval(mins => :minutes)))
        AND NOT EXISTS (
          SELECT 1 FROM notifications n
           WHERE n.user_id = u.id AND n.type = 'boost_suggestion'
             AND n.created_at > NOW() - make_interval(mins => :minutes))`,
    { minutes: BOOST_INTERVAL_MINUTES },
  );
  const slot = bucket(now, 1);
  await notifyMany(ids, 'boost_suggestion', {}, (id) => `test:boost_suggestion:${id}:${slot}`);
}
