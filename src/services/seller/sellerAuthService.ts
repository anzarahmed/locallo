import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import type { InferType } from 'yup';
import redis from '../../config/redis';
import { User } from '../../models/User';
import { Session } from '../../models/Session';
import type { requestOtpSchema, verifyOtpSchema } from '../../validation/seller/sellerAuthSchemas';

type RequestOtpInput = InferType<typeof requestOtpSchema>;
type VerifyOtpInput = InferType<typeof verifyOtpSchema>;

const OTP_KEY_PREFIX = 'otp:seller:';
const SESSION_TTL_DAYS = 30;

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function otpKey(userId: string): string {
  return `${OTP_KEY_PREFIX}${userId}`;
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

  await redis.set(otpKey(user.id), otp, 'EX', ttl);

  // TODO: integrate SMS gateway — log OTP for development
  console.log(`[OTP] ${data.countryCode}${data.phoneNumber} → ${otp}`);
}

export async function verifySellerOtp(data: VerifyOtpInput): Promise<{ token: string; seller: object }> {
  const user = await findActiveSeller(data.phoneNumber);

  const stored = await redis.get(otpKey(user.id));

  if (!stored) {
    throw Object.assign(new Error('OTP expired or not requested'), { status: 410 });
  }
  if (stored !== data.otp) {
    throw Object.assign(new Error('Invalid OTP'), { status: 422 });
  }

  await redis.del(otpKey(user.id));

  if (!user.isVerified) {
    await user.update({ isVerified: true });
  }

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
      isVerified: user.isVerified,
      isActive: user.isActive,
    },
  };
}
