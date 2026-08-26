import type { InferType } from 'yup';
import { UniqueConstraintError } from 'sequelize';
import { User } from '../../models/User';
import { sendOtp } from '../../utils/msg91';
import { generateOtp, makeOtpExpiresAt } from '../../utils/otp';
import { createUserSession } from '../../utils/session';
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

  const otp = generateOtp();
  await user.update({ otpCode: otp, otpExpiresAt: makeOtpExpiresAt() });
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
  if (!user.isActive && !user.deletionRequestedAt) {
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

  await user.update({
    otpCode: null,
    otpExpiresAt: null,
    isVerified: true,
    isActive: true,
    deletionRequestedAt: null,
  });

  const token = await createUserSession(user.id, 'CUSTOMER', data.deviceId, data.deviceType);

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
