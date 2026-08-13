import type { InferType } from 'yup';
import { User } from '../../models/User';
import { Review } from '../../models/Review';
import { Session } from '../../models/Session';
import sequelize from '../../config/database';
import { saveCustomerProfileImage, deleteImage } from '../../utils/imageStorage';
import type { updateCustomerProfileSchema } from '../../validation/customer/customerProfileSchemas';

type UpdateCustomerProfileInput = InferType<typeof updateCustomerProfileSchema>;

export async function getCustomerProfile(userId: string): Promise<User> {
  const user = await User.findOne({ where: { id: userId, role: 'CUSTOMER' } });
  if (!user) {
    throw Object.assign(new Error('Customer not found'), { status: 404 });
  }
  return user;
}

export async function updateCustomerProfile(
  userId: string,
  data: UpdateCustomerProfileInput,
): Promise<User> {
  const user = await User.findOne({ where: { id: userId, role: 'CUSTOMER' } });
  if (!user) {
    throw Object.assign(new Error('Customer not found'), { status: 404 });
  }

  await user.update({
    fullName: data.fullName,
    email: data.email,
    dateOfBirth: data.dateOfBirth,
    gender: data.gender,
  });

  return user;
}

export async function uploadCustomerProfileImage(userId: string, file: Express.Multer.File): Promise<User> {
  const user = await User.findOne({ where: { id: userId, role: 'CUSTOMER' } });
  if (!user) {
    throw Object.assign(new Error('Customer not found'), { status: 404 });
  }

  const previousImage = user.profileImage;
  const key = await saveCustomerProfileImage(file, userId);
  await user.update({ profileImage: key });

  if (previousImage) {
    try {
      await deleteImage(previousImage);
    } catch (err) {
      console.error(`Failed to delete previous profile image for customer ${userId}:`, err);
    }
  }

  return user;
}

export async function deleteCustomerAccount(userId: string): Promise<void> {
  const user = await User.findOne({ where: { id: userId, role: 'CUSTOMER' } });
  if (!user) {
    throw Object.assign(new Error('Customer not found'), { status: 404 });
  }

  const reviews = await Review.findAll({ where: { customerId: userId }, attributes: ['images'] });
  const imageKeys = [
    ...(user.profileImage ? [user.profileImage] : []),
    ...reviews.flatMap((review) => review.images),
  ];

  await sequelize.transaction(async (t) => {
    await Session.destroy({ where: { actorType: 'user', actorId: userId }, transaction: t });
    await user.destroy({ transaction: t });
  });

  await Promise.all(
    imageKeys.map((key) =>
      deleteImage(key).catch((err) => console.error(`Failed to delete image ${key} for deleted customer ${userId}:`, err)),
    ),
  );
}
