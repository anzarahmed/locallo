import { apiPost } from '../lib/axios';
import { PATHS } from '../api/paths';

export async function requestMobileOtp(countryCode: string, mobile: string): Promise<void> {
  await apiPost(PATHS.MOBILE_VERIFY.REQUEST, { countryCode, mobile });
}

export async function verifyMobileOtp(countryCode: string, mobile: string, otp: string): Promise<void> {
  await apiPost(PATHS.MOBILE_VERIFY.VERIFY, { countryCode, mobile, otp });
}
