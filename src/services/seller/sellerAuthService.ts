import type { InferType } from 'yup';
import { User } from '../../models/User';
import { Session } from '../../models/Session';
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
import { hashToken, createUserSession } from '../../utils/session';
import { notifySafely } from '../notifications/notifyService';
import type { requestOtpSchema, verifyOtpSchema } from '../../validation/seller/sellerAuthSchemas';

type RequestOtpInput = InferType<typeof requestOtpSchema>;
type VerifyOtpInput = InferType<typeof verifyOtpSchema>;

async function findActiveSeller(phoneNumber: string): Promise<User> {
  const user = await User.findOne({ where: { mobile: phoneNumber, role: 'SELLER' } });

  if (!user) {
    throw Object.assign(
      new Error(
        'This mobile number is not registered as a Loccalo seller. Please check that you entered the correct number, or contact the Loccalo team to register your shop.',
      ),
      { status: 404 },
    );
  }
  if (!user.isActive && !user.deletionRequestedAt) {
    throw Object.assign(
      new Error('Your seller account has been deactivated. Please contact the Loccalo team to reactivate it.'),
      { status: 403 },
    );
  }

  return user;
}

export async function requestSellerOtp(data: RequestOtpInput): Promise<{ otp: string }> {
  const user = await findActiveSeller(data.phoneNumber);

  assertCanSendOtp(user);
  const otp = generateOtp();
  await recordOtpSent(user, otp);
  await sendOtp(data.countryCode, data.phoneNumber, otp);
  return { otp };
}

export async function logoutSeller(token: string): Promise<void> {
  await Session.destroy({ where: { tokenHash: hashToken(token) } });
}

export async function verifySellerOtp(
  data: VerifyOtpInput,
): Promise<{ token: string; accountRestored: boolean; seller: object }> {
  const user = await findActiveSeller(data.phoneNumber);

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

  const accountRestored = Boolean(user.deletionRequestedAt);
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

  const token = await createUserSession(user.id, 'SELLER', data.deviceId, data.deviceType, data.fcmToken);
  if (isFirstLogin) await notifySafely(user.id, 'welcome_seller', {}, { dedupeKey: `welcome_seller:${user.id}` });

  return {
    token,
    accountRestored,
    seller: {
      id: user.id,
      mobile: user.mobile,
      countryCode: user.countryCode,
      fullName: user.fullName,
      isVerified: true,
      isActive: user.isActive,
    },
  };
}
