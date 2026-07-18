import type { InferType } from 'yup';
import { User } from '../../models/User';
import { SellerProfile } from '../../models/SellerProfile';
import { Session } from '../../models/Session';
import { sendOtp } from '../../utils/msg91';
import { generateOtp, makeOtpExpiresAt } from '../../utils/otp';
import { hashToken, createUserSession } from '../../utils/session';
import type { requestOtpSchema, verifyOtpSchema } from '../../validation/seller/sellerAuthSchemas';

type RequestOtpInput = InferType<typeof requestOtpSchema>;
type VerifyOtpInput = InferType<typeof verifyOtpSchema>;

async function findActiveSeller(phoneNumber: string): Promise<User> {
  const user = await User.findOne({ where: { mobile: phoneNumber, role: 'SELLER' } });

  if (!user) {
    throw Object.assign(new Error('Seller not found'), { status: 404 });
  }
  if (!user.isActive) {
    throw Object.assign(new Error('Account is not active'), { status: 403 });
  }

  const profile = await SellerProfile.findOne({ where: { userId: user.id } });
  if (!profile?.isVerified) {
    throw Object.assign(new Error('KYC verification pending. Contact support to complete verification.'), { status: 403 });
  }

  return user;
}

export async function requestSellerOtp(data: RequestOtpInput): Promise<{ otp: string }> {
  const user = await findActiveSeller(data.phoneNumber);

  const otp = generateOtp();
  await user.update({ otpCode: otp, otpExpiresAt: makeOtpExpiresAt() });
  await sendOtp(data.countryCode, data.phoneNumber, otp);
  return { otp };
}

export async function logoutSeller(token: string): Promise<void> {
  await Session.destroy({ where: { tokenHash: hashToken(token) } });
}

export async function verifySellerOtp(data: VerifyOtpInput): Promise<{ token: string; seller: object }> {
  const user = await findActiveSeller(data.phoneNumber);

  if (!user.otpCode || !user.otpExpiresAt) {
    throw Object.assign(new Error('OTP not requested'), { status: 410 });
  }
  if (user.otpExpiresAt < new Date()) {
    throw Object.assign(new Error('OTP expired'), { status: 410 });
  }
  if (user.otpCode !== data.otp) {
    throw Object.assign(new Error('Invalid OTP'), { status: 422 });
  }

  await user.update({ otpCode: null, otpExpiresAt: null, isVerified: true });

  const token = await createUserSession(user.id, 'SELLER', data.deviceId, data.deviceType);

  return {
    token,
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
