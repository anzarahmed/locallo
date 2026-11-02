import cron from 'node-cron';
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
} from '../services/notifications/scheduledNotifications';
import {
  EMAIL_FREQ_TEST_ON,
  sendKycRemindersTest,
  sendInactivityRemindersTest,
  sendBoostSuggestionsTest,
} from '../services/notifications/emailFrequencyTest';

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
  schedule('minute', '* * * * *', [syncWishlistStock, sendOfferLiveNotifications, sendClosingReminders, sendStartUploadingNudges]);
  schedule('hourly', '7 * * * *', [sendProfileReminders, sendUploadGuideNudges, sendViewMilestones]);
  schedule('daily', '0 10 * * *', [sendOfferUpcomingNotifications, sendOutOfStockDigests, sendInactivityReminders, sendBoostSuggestions, sendKycReminders]);
  schedule('weekly-wishlist', '0 11 * * 0', [sendWishlistWeekly]);
  schedule('monthly', '0 11 1 * *', [sendShareShopReminders]);
  // TEMP: remove after email frequency QA.
  if (EMAIL_FREQ_TEST_ON) {
    schedule('email-freq-test', '* * * * *', [sendKycRemindersTest, sendInactivityRemindersTest, sendBoostSuggestionsTest]);
    console.log('Email frequency test cron scheduled');
  }
  console.log('Notification scheduler crons scheduled (IST)');
}
