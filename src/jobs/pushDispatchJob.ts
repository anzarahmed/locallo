import cron from 'node-cron';
import { Op, QueryTypes } from 'sequelize';
import sequelize from '../config/database';
import { Notification } from '../models/Notification';
import { Session } from '../models/Session';
import { countUnreadNotifications } from '../services/customer/notificationService';
import { isPushConfigured, sendPushToTokens } from '../utils/push';

const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 200;
const MAX_BATCHES_PER_TICK = 20;
const RETRY_DELAY_MS = 2 * 60 * 1000;

let isRunning = false;

// Leases due rows by pushing send_after forward under SKIP LOCKED, so two server
// processes never send the same row and a crash mid-send is retried after the lease.
async function claimDueRows(): Promise<string[]> {
  const rows = await sequelize.query<{ id: string }>(
    `UPDATE notifications SET send_after = NOW() + INTERVAL '5 minutes'
      WHERE id IN (
        SELECT id FROM notifications
         WHERE push_status = 'pending' AND (send_after IS NULL OR send_after <= NOW())
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

async function dispatchRow(row: Notification): Promise<void> {
  const now = new Date();
  const expiresAt = row.pushOptions?.expiresAt ? Date.parse(row.pushOptions.expiresAt) : null;
  if (!row.pushOptions || !row.data) {
    await markRow(row.id, { pushStatus: 'failed', pushLastError: 'Missing push payload' });
    return;
  }
  if (expiresAt !== null && expiresAt <= now.getTime()) {
    await markRow(row.id, { pushStatus: 'failed', pushLastError: 'Expired before delivery' });
    return;
  }

  const sessions = await Session.findAll({
    where: {
      actorType: 'user',
      actorId: row.customerId,
      pushToken: { [Op.ne]: null },
      [Op.or]: [{ expiresAt: null }, { expiresAt: { [Op.gt]: now } }],
    },
    attributes: ['pushToken'],
  });
  const tokens = sessions.map((s) => s.pushToken).filter((t): t is string => Boolean(t));
  if (tokens.length === 0) {
    await markRow(row.id, { pushStatus: 'skipped', pushLastError: 'No registered devices' });
    return;
  }

  const badge = await countUnreadNotifications(row.customerId);
  const results = await sendPushToTokens(tokens, {
    title: row.title,
    body: row.message,
    data: row.data,
    badge,
    options: row.pushOptions,
  });

  const invalidTokens = results.filter((r) => r.outcome === 'invalid_token').map((r) => r.token);
  if (invalidTokens.length > 0) {
    await Session.update(
      { pushToken: null, pushTokenUpdatedAt: now },
      { where: { pushToken: { [Op.in]: invalidTokens } } },
    );
  }

  const lastError = results.find((r) => r.error)?.error ?? null;
  const attempts = row.pushAttempts + 1;

  if (results.some((r) => r.outcome === 'sent')) {
    await markRow(row.id, { pushStatus: 'sent', pushSentAt: now, pushAttempts: attempts, pushLastError: lastError });
  } else if (results.some((r) => r.outcome === 'retryable') && attempts < MAX_ATTEMPTS) {
    await markRow(row.id, {
      pushAttempts: attempts,
      pushLastError: lastError,
      sendAfter: new Date(now.getTime() + RETRY_DELAY_MS * attempts),
    });
  } else {
    await markRow(row.id, { pushStatus: 'failed', pushAttempts: attempts, pushLastError: lastError });
  }
}

export async function processPendingPushes(): Promise<void> {
  if (isRunning || !isPushConfigured()) return;
  isRunning = true;

  try {
    for (let batch = 0; batch < MAX_BATCHES_PER_TICK; batch++) {
      const ids = await claimDueRows();
      if (ids.length === 0) break;

      const rows = await Notification.findAll({ where: { id: { [Op.in]: ids } } });
      const results = await Promise.allSettled(rows.map(dispatchRow));
      await Promise.all(results.map(async (result, i) => {
        if (result.status === 'fulfilled') return;
        const row = rows[i];
        const attempts = row.pushAttempts + 1;
        console.error(`pushDispatchJob: failed to dispatch notification ${row.id}`, result.reason);
        await markRow(row.id, {
          pushAttempts: attempts,
          pushLastError: String((result.reason as Error)?.message ?? result.reason),
          ...(attempts >= MAX_ATTEMPTS ? { pushStatus: 'failed' as const } : {}),
        });
      }));

      if (ids.length < BATCH_SIZE) break;
    }
  } catch (err) {
    console.error('pushDispatchJob: cron tick failed', err);
  } finally {
    isRunning = false;
  }
}

export function startPushDispatchCron(): void {
  cron.schedule('* * * * *', () => {
    processPendingPushes().catch((err) => {
      console.error('pushDispatchJob: unhandled error in cron tick', err);
    });
  });
  console.log(`Push dispatch cron scheduled (every minute)${isPushConfigured() ? '' : ' — FCM not configured, pushes are skipped'}`);
}
