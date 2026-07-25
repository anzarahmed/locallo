import type { Request, Response } from 'express';
import { getCustomerProfile, updateCustomerProfile } from '../../services/customer/customerProfileService';
import { sendSuccess, handleServiceError } from '../../utils/response';
import type { User } from '../../models/User';

function buildProfileResponse(user: User) {
  return {
    id: user.id,
    mobile: user.mobile,
    countryCode: user.countryCode,
    fullName: user.fullName,
    email: user.email,
    dateOfBirth: user.dateOfBirth,
    gender: user.gender,
    isVerified: user.isVerified,
    isActive: user.isActive,
  };
}

export async function getProfile(req: Request, res: Response): Promise<void> {
  try {
    const user = await getCustomerProfile(req.customer!.id);
    sendSuccess(res, buildProfileResponse(user));
  } catch (err: unknown) {
    handleServiceError(err, res);
  }
}

export async function updateProfile(req: Request, res: Response): Promise<void> {
  try {
    const user = await updateCustomerProfile(req.customer!.id, req.body);
    sendSuccess(res, buildProfileResponse(user), 'Profile updated successfully');
  } catch (err: unknown) {
    handleServiceError(err, res);
  }
}
