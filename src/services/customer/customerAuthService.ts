import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import type { InferType } from 'yup';
import { User } from '../../models/User';
import { Session } from '../../models/Session';
import { sendOtp } from '../../utils/msg91';
import type { requestOtpSchema, verifyOtpSchema } from '../../validation/customer/customerAuthSchemas';

type RequestOtpInput = InferType<typeof requestOtpSchema>;
type VerifyOtpInput = InferType<typeof verifyOtpSchema>;

const SESSION_TTL_DAYS = 30;

function generateOtp(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
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

export async function requestCustomerOtp(data: RequestOtpInput): Promise<{ otp: string }> {
  const user = await findOrCreateCustomer(data.phoneNumber, data.countryCode);

  const otp = generateOtp();
  const ttl = parseInt(process.env.OTP_TTL_SECONDS ?? '300', 10);
  const otpExpiresAt = new Date(Date.now() + ttl * 1000);

  await user.update({ otpCode: otp, otpExpiresAt });
  await sendOtp(data.countryCode, data.phoneNumber, otp);
  return { otp };
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

  if (!user.otpCode || !user.otpExpiresAt) {
    throw Object.assign(new Error('OTP not requested'), { status: 410 });
  }
  if (user.otpExpiresAt < new Date()) {
    throw Object.assign(new Error('OTP expired'), { status: 410 });
  }
  if (user.otpCode !== data.otp) {
    throw Object.assign(new Error('Invalid OTP'), { status: 422 });
  }

  const isNewUser = !user.isVerified;

  await user.update({ otpCode: null, otpExpiresAt: null, isVerified: true });

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
