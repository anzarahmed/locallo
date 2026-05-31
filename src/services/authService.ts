import { apiPost } from '../lib/axios';
import { PATHS } from '../api/paths';
import { getDeviceId, getDeviceType } from '../lib/deviceInfo';
import type { Seller } from '../types';

export function requestOtp(countryCode: string, phoneNumber: string): Promise<void> {
  return apiPost(PATHS.AUTH.REQUEST_OTP, {
    countryCode,
    phoneNumber,
    deviceId: getDeviceId(),
    deviceType: getDeviceType(),
  });
}

export function verifyOtp(
  countryCode: string,
  phoneNumber: string,
  otp: string,
): Promise<{ token: string; seller: Seller }> {
  return apiPost(PATHS.AUTH.VERIFY_OTP, {
    countryCode,
    phoneNumber,
    otp,
    deviceId: getDeviceId(),
    deviceType: getDeviceType(),
  });
}
