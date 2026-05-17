import type { InferType } from 'yup';
import sequelize from '../../config/database';
import { User } from '../../models/User';
import { SellerProfile } from '../../models/SellerProfile';
import type { createSellerSchema, updateSellerSchema, updateAddressSchema, adminUpdateSellerSchema } from '../../validation/seller/sellerSchemas';

type CreateSellerInput       = InferType<typeof createSellerSchema>;
type UpdateSellerInput       = InferType<typeof updateSellerSchema>;
type UpdateAddressInput      = InferType<typeof updateAddressSchema>;
type AdminUpdateSellerInput  = InferType<typeof adminUpdateSellerSchema>;

export async function createSeller(
  data: CreateSellerInput,
  adminId: string,
): Promise<{ user: User; profile: SellerProfile }> {
  return sequelize.transaction(async (t) => {
    const existing = await User.findOne({ where: { mobile: data.mobile }, transaction: t });
    if (existing) {
      throw Object.assign(new Error('Mobile number already registered'), { status: 409 });
    }

    const user = await User.create(
      {
        mobile: data.mobile,
        countryCode: data.countryCode ?? null,
        fullName: data.fullName ?? null,
        role: 'SELLER',
        isVerified: false,
        isActive: true,
      },
      { transaction: t },
    );

    const profile = await SellerProfile.create(
      {
        userId: user.id,
        createdBy: adminId,
        businessName: data.businessName,
        email: data.email,
        lat: data.lat,
        long: data.long,
        address: data.address ?? null,
        city: data.city ?? null,
        state: data.state ?? null,
        pincode: data.pincode ?? null,
        category: data.category ?? null,
        bio: data.bio ?? null,
        workingHours: data.workingHours ?? null,
      },
      { transaction: t },
    );

    return { user, profile };
  });
}

export async function updateSellerProfile(
  userId: string,
  data: UpdateSellerInput,
): Promise<{ user: User; profile: SellerProfile }> {
  return sequelize.transaction(async (t) => {
    const user = await User.findOne({
      where: { id: userId, role: 'SELLER' },
      include: [SellerProfile],
      transaction: t,
    });

    if (!user) {
      throw Object.assign(new Error('Seller not found'), { status: 404 });
    }

    const profile = user.sellerProfile;
    if (!profile) {
      throw Object.assign(new Error('Seller profile not found'), { status: 404 });
    }

    const userUpdates: Partial<{ fullName: string }> = {};
    if (data.fullName !== undefined) userUpdates.fullName = data.fullName;

    const profileUpdates: Partial<{
      businessName: string;
      email: string;
      category: string;
      bio: string;
      workingHours: Record<string, unknown>;
    }> = {};
    if (data.businessName !== undefined) profileUpdates.businessName = data.businessName;
    if (data.email !== undefined) profileUpdates.email = data.email;
    if (data.category !== undefined) profileUpdates.category = data.category;
    if (data.bio !== undefined) profileUpdates.bio = data.bio;
    if (data.workingHours !== undefined) profileUpdates.workingHours = data.workingHours as Record<string, unknown>;

    if (Object.keys(userUpdates).length > 0) {
      await user.update(userUpdates, { transaction: t });
    }
    if (Object.keys(profileUpdates).length > 0) {
      await profile.update(profileUpdates, { transaction: t });
    }

    return { user, profile };
  });
}

export async function updateSellerAddress(
  userId: string,
  data: UpdateAddressInput,
): Promise<SellerProfile> {
  const profile = await SellerProfile.findOne({ where: { userId } });
  if (!profile) {
    throw Object.assign(new Error('Seller profile not found'), { status: 404 });
  }

  await profile.update({ address: data.address, lat: data.lat, long: data.long });
  return profile;
}

export async function getSellerList(
  limit: number,
  offset: number,
): Promise<{ sellers: User[]; total: number }> {
  const { count, rows } = await User.findAndCountAll({
    where: { role: 'SELLER' },
    include: [SellerProfile],
    limit,
    offset,
    order: [['id', 'DESC']],
  });

  return { sellers: rows, total: count };
}

export async function adminUpdateSeller(
  id: string,
  data: AdminUpdateSellerInput,
): Promise<{ user: User; profile: SellerProfile }> {
  return sequelize.transaction(async (t) => {
    const user = await User.findOne({
      where: { id, role: 'SELLER' },
      include: [SellerProfile],
      transaction: t,
    });

    if (!user) {
      throw Object.assign(new Error('Seller not found'), { status: 404 });
    }

    const profile = user.sellerProfile;
    if (!profile) {
      throw Object.assign(new Error('Seller profile not found'), { status: 404 });
    }

    if (data.mobile !== user.mobile) {
      const conflict = await User.findOne({ where: { mobile: data.mobile }, transaction: t });
      if (conflict) {
        throw Object.assign(new Error('Mobile number already registered'), { status: 409 });
      }
    }

    await user.update(
      { mobile: data.mobile, countryCode: data.countryCode, fullName: data.fullName ?? null },
      { transaction: t },
    );

    await profile.update(
      {
        businessName: data.businessName,
        email:        data.email,
        category:     data.category ?? null,
        bio:          data.bio ?? null,
        workingHours: (data.workingHours ?? {}) as Record<string, unknown>,
        lat:          data.lat,
        long:         data.long,
      },
      { transaction: t },
    );

    return { user, profile };
  });
}

export async function getSellerById(
  id: string,
): Promise<{ user: User; profile: SellerProfile }> {
  const user = await User.findOne({
    where: { id, role: 'SELLER' },
    include: [SellerProfile],
  });

  if (!user) {
    throw Object.assign(new Error('Seller not found'), { status: 404 });
  }

  const profile = user.sellerProfile;
  if (!profile) {
    throw Object.assign(new Error('Seller profile not found'), { status: 404 });
  }

  return { user, profile };
}
