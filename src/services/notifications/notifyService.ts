import crypto from 'crypto';
import { Op, QueryTypes } from 'sequelize';
import sequelize from '../../config/database';
import { Notification } from '../../models/Notification';
import { Session } from '../../models/Session';
import { User } from '../../models/User';
import { SellerProfile } from '../../models/SellerProfile';
import { isPushConfigured } from '../../utils/push';
import { getIstDateParts, getIstTimeString, istCalendarDateToUtc } from '../../utils/istDate';
import type { EmailStatus, PushOptions, PushStatus } from '../../types';
import type { EmailContent } from '../../utils/emailTemplates/sellerEmailLayout';
import { TEMPLATES, PROMOTIONAL_TYPES } from './templates';
import type { BuiltNotification, NotificationTemplate, NotificationType, TemplateParamsMap } from './templates';
import { getSellerEmailTemplate, isEmailGateOpen } from './sellerEmails';
import { loadSellerRecipients } from './sellerRecipients';

const CHUNK_SIZE = 1000;
const PROMO_DAILY_CAP = 1;
const PROMO_WEEKLY_CAP = 3;
const QUIET_HOURS_START = 21;
const QUIET_HOURS_END = 9;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface NotifyOptions {
  dedupeKey?: string;
  sendAfter?: Date;
}

export function nextSendTime(now: Date = new Date()): Date | null {
  const hour = Number(getIstTimeString(now).slice(0, 2));
  if (hour >= QUIET_HOURS_END && hour < QUIET_HOURS_START) return null;

  const { year, month, day } = getIstDateParts(now);
  const morning = istCalendarDateToUtc(year, month, day, QUIET_HOURS_END);
  return hour >= QUIET_HOURS_START ? new Date(morning.getTime() + DAY_MS) : morning;
}

async function usersWithDevices(userIds: string[]): Promise<Set<string>> {
  const sessions = await Session.findAll({
    where: {
      actorType: 'user',
      actorId: { [Op.in]: userIds },
      pushToken: { [Op.ne]: null },
      [Op.or]: [{ expiresAt: null }, { expiresAt: { [Op.gt]: new Date() } }],
    },
    attributes: ['actorId'],
  });
  return new Set(sessions.map((s) => s.actorId));
}

async function usersWithPrefsOn<P>(userIds: string[], template: NotificationTemplate<P>): Promise<Set<string>> {
  if (template.audience === 'seller') {
    const profiles = await SellerProfile.findAll({
      where: { userId: { [Op.in]: userIds } },
      attributes: ['userId', 'notificationSettings'],
    });
    return new Set(
      profiles
        .filter((p) => {
          const settings = p.notificationSettings;
          if (settings?.pushNotifications !== true) return false;
          return !template.sellerSetting || settings[template.sellerSetting] === true;
        })
        .map((p) => p.userId),
    );
  }

  if (template.pushClass === 'transactional') return new Set(userIds);

  // Apple guideline 4.5.4: promotional pushes need explicit customer opt-in.
  const users = await User.findAll({
    where: { id: { [Op.in]: userIds }, promotionalPush: true },
    attributes: ['id'],
  });
  return new Set(users.map((u) => u.id));
}

async function usersUnderPromoCap(userIds: string[]): Promise<Set<string>> {
  const rows = await sequelize.query<{ user_id: string; day: string; week: string }>(
    `SELECT user_id,
            COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 day') AS day,
            COUNT(*) AS week
       FROM notifications
      WHERE user_id IN (:userIds)
        AND type IN (:types)
        AND push_status IN ('pending', 'sent')
        AND created_at > NOW() - INTERVAL '7 days'
      GROUP BY user_id`,
    { replacements: { userIds, types: PROMOTIONAL_TYPES }, type: QueryTypes.SELECT },
  );
  const capped = new Set(
    rows.filter((r) => Number(r.day) >= PROMO_DAILY_CAP || Number(r.week) >= PROMO_WEEKLY_CAP).map((r) => r.user_id),
  );
  return new Set(userIds.filter((id) => !capped.has(id)));
}

async function withoutExistingDedupeKeys(
  userIds: string[],
  dedupeKeyFor?: (userId: string) => string,
): Promise<string[]> {
  if (!dedupeKeyFor) return userIds;
  const existing = await Notification.findAll({
    where: { dedupeKey: { [Op.in]: userIds.map(dedupeKeyFor) } },
    attributes: ['dedupeKey'],
  });
  const taken = new Set(existing.map((n) => n.dedupeKey));
  return userIds.filter((id) => !taken.has(dedupeKeyFor(id)));
}

async function resolvePushEligible<P>(userIds: string[], template: NotificationTemplate<P>): Promise<Set<string>> {
  if (!template.push || !isPushConfigured() || userIds.length === 0) return new Set();

  let eligible = await usersWithDevices(userIds);
  if (eligible.size === 0) return eligible;

  const withPrefs = await usersWithPrefsOn([...eligible], template);
  eligible = new Set([...eligible].filter((id) => withPrefs.has(id)));
  if (eligible.size === 0 || template.pushClass === 'transactional') return eligible;

  return usersUnderPromoCap([...eligible]);
}

interface EmailFields {
  emailStatus: EmailStatus | null;
  emailContent: EmailContent | null;
}

const NO_EMAIL: EmailFields = { emailStatus: null, emailContent: null };

// Rendered at insert time so the dispatch job needs no params, and the email always
// matches the inbox row even if the template changes before it is sent.
async function resolveEmails<T extends NotificationType>(
  userIds: string[],
  type: T,
  params: TemplateParamsMap[T],
): Promise<Map<string, EmailFields>> {
  const emailTemplate = getSellerEmailTemplate(type);
  if (!emailTemplate) return new Map();

  const recipients = await loadSellerRecipients(userIds);
  return new Map(userIds.map((userId) => {
    const recipient = recipients.get(userId);
    if (!recipient) return [userId, NO_EMAIL];
    const emailContent = emailTemplate.build(params, recipient.name, recipient);
    const sendable = Boolean(recipient.email) && isEmailGateOpen(emailTemplate.gate, recipient.settings);
    return [userId, { emailStatus: sendable ? 'pending' : 'skipped', emailContent }];
  }));
}

export interface NotificationRowFields {
  id: string;
  customerId: string;
  title: string;
  message: string;
  type: NotificationType;
  referenceType: string | null;
  referenceId: string | null;
  data: Record<string, string>;
  pushOptions: PushOptions;
}

export function buildNotificationRow<P>(
  id: string,
  userId: string,
  type: NotificationType,
  template: NotificationTemplate<P>,
  built: BuiltNotification,
): NotificationRowFields {
  return {
    id,
    customerId: userId,
    title: built.title,
    message: built.body,
    type,
    referenceType: built.referenceType ?? null,
    referenceId: built.referenceId ?? null,
    data: {
      screen: built.screen,
      dataTitle: built.dataTitle ?? '',
      id: built.targetId ?? '',
      variantId: built.variantId ?? '',
      notificationId: id,
      type,
      ...built.params,
    },
    pushOptions: {
      pushClass: template.pushClass,
      channel: template.channel,
      ...(built.imageUrl ? { imageUrl: built.imageUrl } : {}),
      ...(built.collapseKey ? { collapseKey: built.collapseKey } : {}),
      ...(built.expiresAt ? { expiresAt: built.expiresAt.toISOString() } : {}),
    },
  };
}

// Writes one inbox row per user and queues a push where settings, devices and the
// promotional cap allow, plus a seller email where the type has one (emailDispatchJob). Rows whose dedupe key already exists are silently skipped,
// which is what makes cron re-runs and webhook retries safe. Returns rows created.
export async function notifyMany<T extends NotificationType>(
  userIds: string[],
  type: T,
  params: TemplateParamsMap[T],
  dedupeKeyFor?: (userId: string) => string,
  sendAfter?: Date,
): Promise<number> {
  const template = TEMPLATES[type] as NotificationTemplate<TemplateParamsMap[T]>;
  const built = template.build(params);
  const quietUntil = template.pushClass === 'promotional' ? nextSendTime() : null;

  let created = 0;
  for (let i = 0; i < userIds.length; i += CHUNK_SIZE) {
    const chunk = await withoutExistingDedupeKeys(userIds.slice(i, i + CHUNK_SIZE), dedupeKeyFor);
    if (chunk.length === 0) continue;
    const eligible = await resolvePushEligible(chunk, template);
    const emails = await resolveEmails(chunk, type, params);

    const rows = chunk.map((userId) => {
      const id = crypto.randomUUID();
      const pushStatus: PushStatus = eligible.has(userId) ? 'pending' : 'skipped';
      return {
        ...buildNotificationRow(id, userId, type, template, built),
        dedupeKey: dedupeKeyFor ? dedupeKeyFor(userId) : null,
        pushStatus,
        sendAfter: pushStatus === 'pending' ? (sendAfter ?? quietUntil ?? new Date()) : null,
        ...(emails.get(userId) ?? NO_EMAIL),
      };
    });

    // ignoreDuplicates still guards a concurrent insert that slipped past the pre-check.
    await Notification.bulkCreate(rows, { ignoreDuplicates: true });
    created += rows.length;
  }
  return created;
}

export async function notify<T extends NotificationType>(
  userId: string,
  type: T,
  params: TemplateParamsMap[T],
  options: NotifyOptions = {},
): Promise<boolean> {
  const { dedupeKey } = options;
  const created = await notifyMany([userId], type, params, dedupeKey ? () => dedupeKey : undefined, options.sendAfter);
  return created > 0;
}

// Never lets a notification failure break the request or job that triggered it.
export function notifySafely<T extends NotificationType>(
  userId: string,
  type: T,
  params: TemplateParamsMap[T],
  options: NotifyOptions = {},
): Promise<void> {
  return notify(userId, type, params, options).then(
    () => undefined,
    (err: unknown) => console.error(`notify: failed to create ${type} for user ${userId}`, err),
  );
}

export async function removeNotificationsOfType(userId: string, type: NotificationType): Promise<void> {
  await Notification.destroy({ where: { customerId: userId, type } });
}
