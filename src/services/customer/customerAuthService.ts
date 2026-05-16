import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import type { InferType } from 'yup';
import redis from '../../config/redis';
import { User } from '../../models/User';
import { Session } from '../../models/Session';
import type { requestOtpSchema, verifyOtpSchema } from '../../validation/customer/customerAuthSchemas';

type RequestOtpInput = InferType<typeof requestOtpSchema>;
type VerifyOtpInput = InferType<typeof verifyOtpSchema>;

const OTP_KEY_PREFIX = 'otp:customer:';
const SESSION_TTL_DAYS = 30;

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function otpKey(userId: string): string {
  return `${OTP_KEY_PREFIX}${userId}`;
}

async function findOrCreateCustomer(phoneNumber: string, countryCode: string): Promise<User> {
  let user = await User.findOne({ where: { mobile: phoneNumber, role: 'CUSTOMER' } });

  if (!user) {
    user = await User.create({
      mobile: phoneNumber,
      countryCode,
      role: 'CUSTOMER',
      isVerified: false,
      isActive: true,
    });
  }

  if (!user.isActive) {
    throw Object.assign(new Error('Account is not active'), { status: 403 });
  }

  return user;
}

export async function requestCustomerOtp(data: RequestOtpInput): Promise<void> {
  const user = await findOrCreateCustomer(data.phoneNumber, data.countryCode);

  const otp = generateOtp();
  const ttl = parseInt(process.env.OTP_TTL_SECONDS ?? '300', 10);

  await redis.set(otpKey(user.id), otp, 'EX', ttl);

  // TODO: integrate SMS gateway — log OTP for development
  console.log(`[OTP] ${data.countryCode}${data.phoneNumber} → ${otp}`);
}

export async function verifyCustomerOtp(
  data: VerifyOtpInput,
): Promise<{ token: string; isNewUser: boolean; customer: object }> {
  const user = await User.findOne({ where: { mobile: data.phoneNumber, role: 'CUSTOMER' } });

  if (!user) {
    throw Object.assign(new Error('Customer not found'), { status: 404 });
  }
  if (!user.isActive) {
    throw Object.assign(new Error('Account is not active'), { status: 403 });
  }

  const stored = await redis.get(otpKey(user.id));

  if (!stored) {
    throw Object.assign(new Error('OTP expired or not requested'), { status: 410 });
  }
  if (stored !== data.otp) {
    throw Object.assign(new Error('Invalid OTP'), { status: 422 });
  }

  await redis.del(otpKey(user.id));

  const isNewUser = !user.isVerified;
  if (isNewUser) {
    await user.update({ isVerified: true });
  }

  const token = jwt.sign(
    { id: user.id, role: 'CUSTOMER' },
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
    isNewUser,
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
