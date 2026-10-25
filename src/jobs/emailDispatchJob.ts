import cron from 'node-cron';
import { Op, QueryTypes } from 'sequelize';
import sequelize from '../config/database';
import { Notification } from '../models/Notification';
import { loadSellerRecipients } from '../services/notifications/sellerRecipients';
import { sendSellerEmail } from '../utils/mailer';

const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 50;
const MAX_BATCHES_PER_TICK = 10;
const RETRY_DELAY_MS = 5 * 60 * 1000;

let isRunning = false;

// Same lease pattern as pushDispatchJob, on its own column so push and email retry independently.
async function claimDueRows(): Promise<string[]> {
  const rows = await sequelize.query<{ id: string }>(
    `UPDATE notifications SET email_send_after = NOW() + INTERVAL '5 minutes'
      WHERE id IN (
        SELECT id FROM notifications
         WHERE email_status = 'pending' AND (email_send_after IS NULL OR email_send_after <= NOW())
         ORDER BY created_at
         LIMIT :limit
         FOR UPDATE SKIP LOCKED
      )
      RETURNING id`,
    { replacements: { limit: BATCH_SIZE }, type: QueryTypes.SELECT },
  );
  return rows.map((r) => r.id);
}

async function markRow(id: string, fields: Partial<Notification>): Promise<void> {
  await Notification.update(fields, { where: { id } });
}

async function dispatchRow(row: Notification, to: string | null): Promise<void> {
  if (!row.emailContent) {
    await markRow(row.id, { emailStatus: 'failed', emailLastError: 'Missing email content' });
    return;
  }
  if (!to) {
    await markRow(row.id, { emailStatus: 'skipped', emailLastError: 'No email address on file' });
    return;
  }

  const attempts = row.emailAttempts + 1;
  try {
    await sendSellerEmail(to, row.emailContent);
    await markRow(row.id, { emailStatus: 'sent', emailSentAt: new Date(), emailAttempts: attempts, emailLastError: null });
  } catch (err) {
    console.error(`emailDispatchJob: failed to send notification ${row.id}`, err);
    await markRow(row.id, {
      emailAttempts: attempts,
      emailLastError: String((err as Error)?.message ?? err),
      ...(attempts >= MAX_ATTEMPTS
        ? { emailStatus: 'failed' as const }
        : { emailSendAfter: new Date(Date.now() + RETRY_DELAY_MS * attempts) }),
    });
  }
}

export async function processPendingEmails(): Promise<void> {
  if (isRunning) return;
  isRunning = true;

  try {
    for (let batch = 0; batch < MAX_BATCHES_PER_TICK; batch++) {
      const ids = await claimDueRows();
      if (ids.length === 0) break;

      const rows = await Notification.findAll({ where: { id: { [Op.in]: ids } } });
      // Resolved at send time, so an address the seller just changed is used.
      const recipients = await loadSellerRecipients([...new Set(rows.map((r) => r.customerId))]);
      // Sequential: Gmail SMTP throttles bursts of parallel connections.
      for (const row of rows) {
        await dispatchRow(row, recipients.get(row.customerId)?.email ?? null);
      }

      if (ids.length < BATCH_SIZE) break;
    }
  } catch (err) {
    console.error('emailDispatchJob: cron tick failed', err);
  } finally {
    isRunning = false;
  }
}

export function startEmailDispatchCron(): void {
  cron.schedule('* * * * *', () => {
    processPendingEmails().catch((err) => {
      console.error('emailDispatchJob: unhandled error in cron tick', err);
    });
  });
  console.log('Email dispatch cron scheduled (every minute)');
}
