import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import type { InferType } from 'yup';
import { User } from '../../models/User';
import { Session } from '../../models/Session';
import { sendOtp } from '../../utils/msg91';
import type { requestOtpSchema, verifyOtpSchema } from '../../validation/seller/sellerAuthSchemas';

type RequestOtpInput = InferType<typeof requestOtpSchema>;
type VerifyOtpInput = InferType<typeof verifyOtpSchema>;

const SESSION_TTL_DAYS = 30;

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function findActiveSeller(phoneNumber: string): Promise<User> {
  const user = await User.findOne({ where: { mobile: phoneNumber, role: 'SELLER' } });

  if (!user) {
    throw Object.assign(new Error('Seller not found'), { status: 404 });
  }
  if (!user.isActive) {
    throw Object.assign(new Error('Account is not active'), { status: 403 });
  }

  return user;
}

export async function requestSellerOtp(data: RequestOtpInput): Promise<void> {
  const user = await findActiveSeller(data.phoneNumber);

  const otp = generateOtp();
  const ttl = parseInt(process.env.OTP_TTL_SECONDS ?? '300', 10);
  const otpExpiresAt = new Date(Date.now() + ttl * 1000);

  await user.update({ otpCode: otp, otpExpiresAt });
  await sendOtp(data.countryCode, data.phoneNumber, otp);
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

  const token = jwt.sign(
    { id: user.id, role: 'SELLER' },
    process.env.JWT_SECRET as string,
    { expiresIn: `${SESSION_TTL_DAYS}d` },
  );

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_TTL_DAYS);

  await Session.create({
    actorType: 'user',
    actorId: user.id,
    tokenHash: crypto.createHash('sha256').update(token).digest('hex'),
    deviceId: data.deviceId,
    deviceType: data.deviceType,
    expiresAt,
  });

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
