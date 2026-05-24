import type { InferType } from 'yup';
import { Op, literal } from 'sequelize';
import sequelize from '../../config/database';
import { User } from '../../models/User';
import { SellerProfile } from '../../models/SellerProfile';
import { Category } from '../../models/Category';
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
        categoryId: data.categoryId ?? null,
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
      include: [{ model: SellerProfile, include: [Category] }],
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
      categoryId: number;
      bio: string;
      workingHours: Record<string, unknown>;
    }> = {};
    if (data.businessName !== undefined) profileUpdates.businessName = data.businessName;
    if (data.email !== undefined) profileUpdates.email = data.email;
    if (data.categoryId !== undefined) profileUpdates.categoryId = data.categoryId;
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

const VALID_SELLER_SORT = new Set(['fullName', 'mobile', 'isActive', 'businessName', 'email', 'createdAt']);
const PROFILE_SORT_FIELDS = new Set(['businessName', 'email']);

export interface GetSellerListOptions {
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  isActive?: boolean;
  categoryId?: number;
  fullName?: string;
  businessName?: string;
  mobile?: string;
}

export async function getSellerList(
  limit: number,
  offset: number,
  options: GetSellerListOptions = {},
): Promise<{ sellers: User[]; total: number }> {
  const {
    sortOrder = 'ASC',
    isActive,
    categoryId,
    fullName,
    businessName,
    mobile,
  } = options;

  const sortBy = VALID_SELLER_SORT.has(options.sortBy ?? '') ? (options.sortBy as string) : 'createdAt';

  const userWhere: Record<string, unknown> = { role: 'SELLER' };
  if (isActive !== undefined) userWhere.isActive = isActive;
  if (fullName) userWhere.fullName = { [Op.iLike]: `%${fullName}%` };
  if (mobile) userWhere.mobile = { [Op.iLike]: `%${mobile}%` };

  const profileWhere: Record<string, unknown> = {};
  if (categoryId !== undefined) profileWhere.categoryId = categoryId;
  if (businessName) profileWhere.businessName = { [Op.iLike]: `%${businessName}%` };

  const hasProfileFilter = Object.keys(profileWhere).length > 0;
  const isProfileSortField = PROFILE_SORT_FIELDS.has(sortBy);

  // For profile fields use literal SQL (snake_case column, alias matches HasOne property name)
  const PROFILE_COL_MAP: Record<string, string> = {
    businessName: '"sellerProfile"."business_name"',
    email:        '"sellerProfile"."email"',
  };
  const orderClause = isProfileSortField
    ? [[literal(PROFILE_COL_MAP[sortBy]), sortOrder]]
    : [[sortBy, sortOrder]];

  const { count, rows } = await User.findAndCountAll({
    where: userWhere,
    include: [{
      model: SellerProfile,
      ...(hasProfileFilter ? { where: profileWhere, required: true } : {}),
      include: [Category],
    }],
    limit,
    offset,
    order: orderClause as never,
    subQuery: false,
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
      include: [{ model: SellerProfile, include: [Category] }],
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
        categoryId:   data.categoryId ?? null,
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

export async function toggleSellerStatus(id: string): Promise<User> {
  const user = await User.findOne({ where: { id, role: 'SELLER' } });
  if (!user) {
    throw Object.assign(new Error('Seller not found'), { status: 404 });
  }
  await user.update({ isActive: !user.isActive });
  return user;
}

export async function getSellerById(
  id: string,
): Promise<{ user: User; profile: SellerProfile }> {
  const user = await User.findOne({
    where: { id, role: 'SELLER' },
    include: [{ model: SellerProfile, include: [Category] }],
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
