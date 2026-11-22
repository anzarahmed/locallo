import type { InferType } from 'yup';
import { UniqueConstraintError } from 'sequelize';
import { User } from '../../models/User';
import { sendOtp } from '../../utils/msg91';
import { generateOtp } from '../../utils/otp';
import {
  assertCanSendOtp,
  assertNotLocked,
  isOtpMatch,
  OTP_GUARD_RESET,
  recordOtpSent,
  registerFailedAttempt,
} from '../../utils/otpGuard';
import { createUserSession, hashToken } from '../../utils/session';
import { Session } from '../../models/Session';
import { notifySafely, queueWelcomePush } from '../notifications/notifyService';
import type { requestOtpSchema, verifyOtpSchema } from '../../validation/customer/customerAuthSchemas';

type RequestOtpInput = InferType<typeof requestOtpSchema>;
type VerifyOtpInput = InferType<typeof verifyOtpSchema>;

async function findOrCreateCustomer(phoneNumber: string, countryCode: string): Promise<User> {
  let user = await User.findOne({ where: { mobile: phoneNumber, role: 'CUSTOMER' } });

  if (!user) {
    try {
      user = await User.create({
        mobile: phoneNumber,
        countryCode,
        role: 'CUSTOMER',
        isVerified: false,
        isActive: true,
      });
    } catch (err: unknown) {
      if (err instanceof UniqueConstraintError) {
        user = await User.findOne({ where: { mobile: phoneNumber, role: 'CUSTOMER' } });
        if (!user) throw err;
      } else {
        throw err;
      }
    }
  }

  if (!user.isActive && !user.deletionRequestedAt) {
    throw Object.assign(new Error('Account is not active'), { status: 403 });
  }

  return user;
}

export async function requestCustomerOtp(data: RequestOtpInput): Promise<{ otp: string }> {
  const user = await findOrCreateCustomer(data.phoneNumber, data.countryCode);

  assertCanSendOtp(user);
  const otp = generateOtp();
  await recordOtpSent(user, otp);
  await sendOtp(data.countryCode, data.phoneNumber, otp);
  return { otp };
}

export async function verifyCustomerOtp(
  data: VerifyOtpInput,
): Promise<{ token: string; isNewUser: boolean; accountRestored: boolean; customer: object }> {
  const user = await User.findOne({ where: { mobile: data.phoneNumber, role: 'CUSTOMER' } });

  if (!user) {
    throw Object.assign(new Error('Customer not found'), { status: 404 });
  }
  if (!user.isActive && !user.deletionRequestedAt) {
    throw Object.assign(new Error('Account is not active'), { status: 403 });
  }

  assertNotLocked(user);
  if (!user.otpCode || !user.otpExpiresAt) {
    throw Object.assign(new Error('OTP not requested'), { status: 410 });
  }
  if (user.otpExpiresAt < new Date()) {
    throw Object.assign(new Error('OTP expired'), { status: 410 });
  }
  if (!isOtpMatch(user.otpCode, data.otp)) {
    await registerFailedAttempt(user.id);
  }

  const isNewUser = !user.isVerified;
  const deletionRequestedAt = user.deletionRequestedAt;
  const accountRestored = Boolean(deletionRequestedAt);
  const isFirstLogin = !user.firstLoginAt;

  await user.update({
    otpCode: null,
    otpExpiresAt: null,
    ...OTP_GUARD_RESET,
    isVerified: true,
    isActive: true,
    deletionRequestedAt: null,
    lastActiveAt: new Date(),
    ...(isFirstLogin ? { firstLoginAt: new Date() } : {}),
  });

  const token = await createUserSession(user.id, 'CUSTOMER', data.deviceId, data.deviceType, data.fcmToken);
  if (isFirstLogin) await notifySafely(user.id, 'welcome_customer', {}, { dedupeKey: `welcome_customer:${user.id}` });
  if (deletionRequestedAt) {
    await notifySafely(user.id, 'welcome_back_customer', { name: user.fullName ?? '' }, {
      dedupeKey: `welcome_back_customer:${user.id}:${new Date(deletionRequestedAt).getTime()}`,
    });
  }
  if (data.fcmToken) {
    await queueWelcomePush(user.id).catch((err: unknown) =>
      console.error(`verify-otp: failed to queue welcome push for ${user.id}`, err));
  }

  return {
    token,
    isNewUser,
    accountRestored,
    customer: {
      id: user.id,
      mobile: user.mobile,
      countryCode: user.countryCode,
      fullName: user.fullName,
      isVerified: true,
      isActive: user.isActive,
    },
  };
}

export async function logoutCustomer(token: string): Promise<void> {
  await Session.destroy({ where: { tokenHash: hashToken(token) } });
}
