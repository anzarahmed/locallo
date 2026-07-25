import type { InferType } from 'yup';
import { User } from '../../models/User';
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
