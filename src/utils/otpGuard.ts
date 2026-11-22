import { timingSafeEqual } from 'crypto';
import { QueryTypes } from 'sequelize';
import sequelize from '../config/database';
import type { User } from '../models/User';
import { makeOtpExpiresAt } from './otp';

function intEnv(name: string, fallback: number): number {
  const value = parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export const OTP_MAX_ATTEMPTS = intEnv('OTP_MAX_ATTEMPTS', 3);
export const OTP_LOCK_MINUTES = intEnv('OTP_LOCK_MINUTES', 15);
export const OTP_RESEND_COOLDOWN_SECONDS = intEnv('OTP_RESEND_COOLDOWN_SECONDS', 30);
export const OTP_MAX_SENDS = intEnv('OTP_MAX_SENDS', 5);
export const OTP_SEND_WINDOW_MINUTES = intEnv('OTP_SEND_WINDOW_MINUTES', 60);

export const OTP_GUARD_RESET = {
  otpAttempts: 0,
  otpLockedUntil: null,
  otpSendCount: 0,
  otpSendWindowStart: null,
} as const;

function otpError(message: string, status: number, data?: Record<string, number>): Error {
  return Object.assign(new Error(message), { status, data });
}

function secondsUntil(date: Date, now: Date): number {
  return Math.max(1, Math.ceil((date.getTime() - now.getTime()) / 1000));
}

function describeWait(seconds: number): string {
  if (seconds < 60) return `${seconds} second${seconds === 1 ? '' : 's'}`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
}

function lockedError(lockedUntil: Date, now: Date): Error {
  const retryAfterSeconds = secondsUntil(lockedUntil, now);
  return otpError(
    `Too many incorrect attempts. Please try again in ${describeWait(retryAfterSeconds)}.`,
    429,
    { retryAfterSeconds },
  );
}

function activeWindowStart(user: User, now: Date): Date | null {
  const start = user.otpSendWindowStart;
  if (!start) return null;
  return now.getTime() - start.getTime() < OTP_SEND_WINDOW_MINUTES * 60_000 ? start : null;
}

export function assertNotLocked(user: User, now = new Date()): void {
  if (user.otpLockedUntil && user.otpLockedUntil > now) throw lockedError(user.otpLockedUntil, now);
}

export function assertCanSendOtp(user: User, now = new Date()): void {
  assertNotLocked(user, now);

  if (user.otpLastSentAt) {
    const cooldownEnds = new Date(user.otpLastSentAt.getTime() + OTP_RESEND_COOLDOWN_SECONDS * 1000);
    if (cooldownEnds > now) {
      const retryAfterSeconds = secondsUntil(cooldownEnds, now);
      throw otpError(
        `Please wait ${describeWait(retryAfterSeconds)} before requesting a new OTP.`,
        429,
        { retryAfterSeconds },
      );
    }
  }

  const windowStart = activeWindowStart(user, now);
  if (windowStart && user.otpSendCount >= OTP_MAX_SENDS) {
    const windowEnds = new Date(windowStart.getTime() + OTP_SEND_WINDOW_MINUTES * 60_000);
    const retryAfterSeconds = secondsUntil(windowEnds, now);
    throw otpError(
      `Too many OTP requests. Please try again in ${describeWait(retryAfterSeconds)}.`,
      429,
      { retryAfterSeconds },
    );
  }
}

export async function recordOtpSent(user: User, otp: string, now = new Date()): Promise<void> {
  const windowStart = activeWindowStart(user, now);
  await user.update({
    otpCode: otp,
    otpExpiresAt: makeOtpExpiresAt(),
    otpAttempts: 0,
    otpLockedUntil: null,
    otpLastSentAt: now,
    otpSendCount: windowStart ? user.otpSendCount + 1 : 1,
    otpSendWindowStart: windowStart ?? now,
  });
}

export function isOtpMatch(stored: string, given: string): boolean {
  const a = Buffer.from(stored);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

interface AttemptRow {
  otp_attempts: number;
  otp_locked_until: Date | null;
}

// Atomic so parallel wrong guesses can't each read the same count and exceed the limit.
// In Postgres every SET expression sees the pre-update row, so the CASEs all test the same count.
export async function registerFailedAttempt(userId: string): Promise<never> {
  const now = new Date();
  const lockedUntil = new Date(now.getTime() + OTP_LOCK_MINUTES * 60_000);
  const rows = await sequelize.query<AttemptRow>(
    `UPDATE users SET
       otp_attempts     = otp_attempts + 1,
       otp_code         = CASE WHEN otp_attempts + 1 >= :max THEN NULL ELSE otp_code END,
       otp_expires_at   = CASE WHEN otp_attempts + 1 >= :max THEN NULL ELSE otp_expires_at END,
       otp_locked_until = CASE WHEN otp_attempts + 1 >= :max
                               THEN CAST(:lockedUntil AS TIMESTAMPTZ)
                               ELSE otp_locked_until END
     WHERE id = :userId AND otp_code IS NOT NULL
     RETURNING otp_attempts, otp_locked_until`,
    {
      replacements: { userId, max: OTP_MAX_ATTEMPTS, lockedUntil: lockedUntil.toISOString() },
      type: QueryTypes.SELECT,
    },
  );

  const row = rows[0];
  if (!row || row.otp_attempts >= OTP_MAX_ATTEMPTS) {
    throw lockedError(row?.otp_locked_until ? new Date(row.otp_locked_until) : lockedUntil, now);
  }

  const attemptsLeft = OTP_MAX_ATTEMPTS - row.otp_attempts;
  throw otpError(
    `Invalid OTP. ${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} left.`,
    422,
    { attemptsLeft },
  );
}
