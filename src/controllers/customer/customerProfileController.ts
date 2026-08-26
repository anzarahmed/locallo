import type { Request, Response } from 'express';
import { getCustomerProfile, updateCustomerProfile, uploadCustomerProfileImage, requestCustomerAccountDeletion } from '../../services/customer/customerProfileService';
import { sendSuccess, sendError, handleServiceError } from '../../utils/response';
import { getPresignedUrlOrNull } from '../../utils/imageStorage';
import type { User } from '../../models/User';

async function buildProfileResponse(user: User): Promise<Record<string, unknown>> {
  return {
    id: user.id,
    mobile: user.mobile,
    countryCode: user.countryCode,
    fullName: user.fullName,
    email: user.email,
    dateOfBirth: user.dateOfBirth,
    gender: user.gender,
    profileImage: await getPresignedUrlOrNull(user.profileImage),
    isVerified: user.isVerified,
    isActive: user.isActive,
  };
}

export async function getProfile(req: Request, res: Response): Promise<void> {
  try {
    const user = await getCustomerProfile(req.customer!.id);
    sendSuccess(res, await buildProfileResponse(user));
  } catch (err: unknown) {
    handleServiceError(err, res);
  }
}

export async function updateProfile(req: Request, res: Response): Promise<void> {
  try {
    const user = await updateCustomerProfile(req.customer!.id, req.body);
    sendSuccess(res, await buildProfileResponse(user), 'Profile updated successfully');
  } catch (err: unknown) {
    handleServiceError(err, res);
  }
}

export async function uploadProfileImage(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    sendError(res, 'No image file provided', 400);
    return;
  }
  try {
    const user = await uploadCustomerProfileImage(req.customer!.id, req.file);
    sendSuccess(res, await buildProfileResponse(user), 'Profile image updated successfully');
  } catch (err: unknown) {
    handleServiceError(err, res, 'Failed to upload profile image');
  }
}

export async function deleteAccount(req: Request, res: Response): Promise<void> {
  try {
    await requestCustomerAccountDeletion(req.customer!.id);
    sendSuccess(res, null, 'Account scheduled for deletion in 30 days. Log in again during this period to reactivate it.');
  } catch (err: unknown) {
    handleServiceError(err, res, 'Failed to delete account');
  }
}
