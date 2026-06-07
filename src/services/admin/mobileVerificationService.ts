import { sendOtp } from '../../utils/msg91';
import { generateOtp, makeOtpExpiresAt } from '../../utils/otp';

interface OtpEntry {
  otp: string;
  expiresAt: Date;
}

const otpStore = new Map<string, OtpEntry>();

function makeKey(countryCode: string, mobile: string): string {
  return `${countryCode}:${mobile}`;
}

export async function requestAdminMobileOtp(countryCode: string, mobile: string): Promise<{ otp: string }> {
  const otp = generateOtp();
  otpStore.set(makeKey(countryCode, mobile), { otp, expiresAt: makeOtpExpiresAt() });
  await sendOtp(countryCode, mobile, otp);
  return { otp };
}

export function verifyAdminMobileOtp(countryCode: string, mobile: string, otp: string): void {
  const key = makeKey(countryCode, mobile);
  const entry = otpStore.get(key);

  if (!entry) {
    throw Object.assign(new Error('OTP not requested'), { status: 410 });
  }
  if (entry.expiresAt < new Date()) {
    otpStore.delete(key);
    throw Object.assign(new Error('OTP expired'), { status: 410 });
  }
  if (entry.otp !== otp) {
    throw Object.assign(new Error('Invalid OTP'), { status: 422 });
  }

  otpStore.delete(key);
}
