import { Op } from 'sequelize';
import { Notification } from '../../models/Notification';
import {
  sendProfileReminders,
  sendStartUploadingNudges,
  sendUploadGuideNudges,
  sendOfferLiveNotifications,
  sendOfferUpcomingNotifications,
  sendWishlistWeekly,
  syncWishlistStock,
  sendViewMilestones,
  sendOutOfStockDigests,
  sendInactivityReminders,
  sendBoostSuggestions,
  sendKycReminders,
  sendShareShopReminders,
  sendClosingReminders,
} from '../notifications/scheduledNotifications';
import { processPendingPushes } from '../../jobs/pushDispatchJob';
import { processPendingEmails } from '../../jobs/emailDispatchJob';
import { processPendingOfferNotifications } from '../../jobs/offerNotificationJob';

interface TestCronJob {
  run: (now?: Date) => Promise<void>;
  schedule: string;
  notifications: string;
  acceptsNow: boolean;
}

// processExpiredDeletions (account deletion) is left out on purpose: it permanently deletes accounts.
const TEST_CRON_JOBS = {
  sendProfileReminders:           { run: sendProfileReminders,           schedule: 'hourly at :07 IST',  notifications: 'profile_incomplete',               acceptsNow: true },
  sendStartUploadingNudges:       { run: sendStartUploadingNudges,       schedule: 'every minute',       notifications: 'first_product_nudge (reminder 1)', acceptsNow: true },
  sendUploadGuideNudges:          { run: sendUploadGuideNudges,          schedule: 'hourly at :07 IST',  notifications: 'first_product_nudge (reminder 2)', acceptsNow: true },
  sendOfferLiveNotifications:     { run: sendOfferLiveNotifications,     schedule: 'every minute',       notifications: 'offer_live',                       acceptsNow: true },
  sendOfferUpcomingNotifications: { run: sendOfferUpcomingNotifications, schedule: 'daily 10:00 IST',    notifications: 'offer upcoming',                   acceptsNow: true },
  sendWishlistWeekly:             { run: sendWishlistWeekly,             schedule: 'Sunday 11:00 IST',   notifications: 'wishlist_weekly',                  acceptsNow: true },
  syncWishlistStock:              { run: syncWishlistStock,              schedule: 'every minute',       notifications: 'wishlist_out_of_stock / back_in_stock', acceptsNow: true },
  sendViewMilestones:             { run: sendViewMilestones,             schedule: 'hourly at :07 IST',  notifications: 'views_milestone',                  acceptsNow: false },
  sendOutOfStockDigests:          { run: sendOutOfStockDigests,          schedule: 'daily 10:00 IST',    notifications: 'out_of_stock_digest',              acceptsNow: true },
  sendInactivityReminders:        { run: sendInactivityReminders,        schedule: 'daily 10:00 IST',    notifications: 'seller_inactive',                  acceptsNow: true },
  sendBoostSuggestions:           { run: sendBoostSuggestions,           schedule: 'daily 10:00 IST',    notifications: 'boost_suggestion',                 acceptsNow: true },
  sendKycReminders:               { run: sendKycReminders,               schedule: 'daily 10:00 IST',    notifications: 'kyc_pending',                      acceptsNow: true },
  sendShareShopReminders:         { run: sendShareShopReminders,         schedule: '1st of month 11:00 IST', notifications: 'share_shop',                   acceptsNow: true },
  sendClosingReminders:           { run: sendClosingReminders,           schedule: 'every minute',       notifications: 'closing_soon',                     acceptsNow: true },
  processPendingPushes:           { run: processPendingPushes,           schedule: 'every minute',       notifications: 'sends due pending pushes',         acceptsNow: false },
  processPendingEmails:           { run: processPendingEmails,           schedule: 'every minute',       notifications: 'sends due pending seller emails',  acceptsNow: false },
  processPendingOfferNotifications: { run: processPendingOfferNotifications, schedule: 'every 5 minutes', notifications: 'offer_join (Offer Mania)',      acceptsNow: false },
} satisfies Record<string, TestCronJob>;

export type TestCronJobName = keyof typeof TEST_CRON_JOBS;

export const TEST_CRON_JOB_NAMES = Object.keys(TEST_CRON_JOBS) as TestCronJobName[];

const MAX_LISTED_NOTIFICATIONS = 200;

export interface TestCronJobInfo {
  job: TestCronJobName;
  schedule: string;
  notifications: string;
  acceptsNow: boolean;
}

export interface CreatedNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  pushStatus: string;
  emailStatus: string | null;
  sendAfter: Date | null;
}

export interface TestCronRunResult {
  job: TestCronJobName;
  now: Date | null;
  durationMs: number;
  notificationsCreated: number;
  notifications: CreatedNotification[];
}

export function listTestCronJobs(): TestCronJobInfo[] {
  return TEST_CRON_JOB_NAMES.map((job) => {
    const { schedule, notifications, acceptsNow } = TEST_CRON_JOBS[job];
    return { job, schedule, notifications, acceptsNow };
  });
}

export async function runTestCronJob(job: TestCronJobName, now?: Date): Promise<TestCronRunResult> {
  const entry: TestCronJob = TEST_CRON_JOBS[job];
  if (now && !entry.acceptsNow) {
    throw Object.assign(new Error(`${job} does not accept a "now" override`), { status: 400 });
  }

  const startedAt = new Date();
  await (now ? entry.run(now) : entry.run());
  const durationMs = Date.now() - startedAt.getTime();

  // Rows from the real crons running at the same moment can show up here too.
  const { rows, count } = await Notification.findAndCountAll({
    where: { createdAt: { [Op.gte]: startedAt } },
    attributes: ['id', 'customerId', 'type', 'title', 'pushStatus', 'emailStatus', 'sendAfter'],
    order: [['createdAt', 'ASC']],
    limit: MAX_LISTED_NOTIFICATIONS,
  });

  return {
    job,
    now: now ?? null,
    durationMs,
    notificationsCreated: count,
    notifications: rows.map((n) => ({
      id: n.id,
      userId: n.customerId,
      type: n.type,
      title: n.title,
      pushStatus: n.pushStatus,
      emailStatus: n.emailStatus,
      sendAfter: n.sendAfter,
    })),
  };
}
