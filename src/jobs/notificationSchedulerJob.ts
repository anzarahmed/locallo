import cron from 'node-cron';
import {
  sendProfileReminders,
  sendFirstProductNudges,
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
} from '../services/notifications/scheduledNotifications';

const TIMEZONE = 'Asia/Kolkata';

type Task = () => Promise<void>;

const running = new Set<string>();

async function runTasks(name: string, tasks: Task[]): Promise<void> {
  if (running.has(name)) return;
  running.add(name);
  try {
    // Sequential so one slow query doesn't stack every task against the DB at once.
    for (const task of tasks) {
      try {
        await task();
      } catch (err) {
        console.error(`notificationSchedulerJob[${name}]: ${task.name} failed`, err);
      }
    }
  } finally {
    running.delete(name);
  }
}

function schedule(name: string, expression: string, tasks: Task[]): void {
  cron.schedule(expression, () => {
    runTasks(name, tasks).catch((err) => console.error(`notificationSchedulerJob[${name}]: unhandled error`, err));
  }, { timezone: TIMEZONE });
}

export function startNotificationSchedulerCron(): void {
  schedule('minute', '* * * * *', [sendClosingReminders]);
  schedule('five-minutes', '*/5 * * * *', [syncWishlistStock, sendOfferLiveNotifications]);
  schedule('hourly', '7 * * * *', [sendProfileReminders, sendFirstProductNudges, sendViewMilestones]);
  schedule('daily', '0 10 * * *', [sendOfferUpcomingNotifications, sendOutOfStockDigests, sendInactivityReminders, sendBoostSuggestions]);
  schedule('weekly-kyc', '0 10 * * 1', [sendKycReminders]);
  schedule('weekly-wishlist', '0 11 * * 0', [sendWishlistWeekly]);
  schedule('monthly', '0 11 1 * *', [sendShareShopReminders]);
  console.log('Notification scheduler crons scheduled (IST)');
}
