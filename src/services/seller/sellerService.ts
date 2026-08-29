import type { InferType } from 'yup';
import { Op, literal } from 'sequelize';
import sequelize from '../../config/database';
import { User } from '../../models/User';
import { SellerProfile } from '../../models/SellerProfile';
import { Brand } from '../../models/Brand';
import { Product } from '../../models/Product';
import { ProductVariant } from '../../models/ProductVariant';
import { Review } from '../../models/Review';
import { Session } from '../../models/Session';
import type { NotificationSettings, CustomDayOverride, KycDocumentType, KycDocuments, BrandDocumentType, BrandDocuments } from '../../types';
import { saveKycDocument, saveBrandDocument, normalizeImageKey, commitSellerPhoto, deleteImage } from '../../utils/imageStorage';
import { sendKycVerificationEmail } from '../../utils/mailer';
import { createDefaultLedgers } from './ledgerService';
import type { createSellerSchema, updateSellerSchema, updateAddressSchema, adminUpdateSellerSchema } from '../../validation/seller/sellerSchemas';

type CreateSellerInput       = InferType<typeof createSellerSchema>;
type UpdateSellerInput       = InferType<typeof updateSellerSchema>;
type UpdateAddressInput      = InferType<typeof updateAddressSchema>;
type AdminUpdateSellerInput  = InferType<typeof adminUpdateSellerSchema>;

async function requireSellerProfile(userId: string): Promise<SellerProfile> {
  const profile = await SellerProfile.findOne({ where: { userId } });
  if (!profile) {
    throw Object.assign(new Error('Seller profile not found'), { status: 404 });
  }
  return profile;
}

export async function createSeller(
  data: CreateSellerInput,
  adminId: string,
): Promise<{ user: User; profile: SellerProfile }> {
  return sequelize.transaction(async (t) => {
    const existing = await User.findOne({ where: { mobile: data.mobile, role: 'SELLER' }, transaction: t });
    if (existing) {
      throw Object.assign(new Error('Mobile number already registered'), { status: 409 });
    }

    const emailConflict = await SellerProfile.findOne({
      where: { email: { [Op.iLike]: data.email } },
      transaction: t,
    });
    if (emailConflict) {
      throw Object.assign(new Error('Email already registered'), { status: 409 });
    }

    const photo = await commitSellerPhoto(normalizeImageKey(data.photo));

    const user = await User.create(
      {
        mobile: data.mobile,
        countryCode: data.countryCode ?? null,
        fullName: data.fullName ?? null,
        role: 'SELLER',
        isVerified: false,
        isActive: true,
        profileImage: photo,
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
        categoryIds: data.categoryIds ?? [],
        bio: data.bio ?? null,
        workingHours: data.workingHours ?? null,
      },
      { transaction: t },
    );

    await createDefaultLedgers(user.id, t);

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
      include: [{ model: SellerProfile }],
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
      categoryIds: number[];
      bio: string;
      workingHours: Record<string, unknown>;
    }> = {};
    if (data.businessName !== undefined) profileUpdates.businessName = data.businessName;
    if (data.email !== undefined && data.email !== profile.email) {
      const emailConflict = await SellerProfile.findOne({
        where: { email: { [Op.iLike]: data.email }, userId: { [Op.ne]: user.id } },
        transaction: t,
      });
      if (emailConflict) {
        throw Object.assign(new Error('Email already registered'), { status: 409 });
      }
      profileUpdates.email = data.email;
    }
    if (data.categoryIds !== undefined) profileUpdates.categoryIds = data.categoryIds.filter((id): id is number => id !== undefined);
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
  const profile = await requireSellerProfile(userId);
  await profile.update({ address: data.address, lat: data.lat, long: data.long });
  return profile;
}

export async function requestSellerAccountDeletion(userId: string): Promise<void> {
  const user = await User.findOne({ where: { id: userId, role: 'SELLER' } });
  if (!user) {
    throw Object.assign(new Error('Seller not found'), { status: 404 });
  }

  await sequelize.transaction(async (t) => {
    await Session.destroy({ where: { actorType: 'user', actorId: userId }, transaction: t });
    await user.update({ isActive: false, deletionRequestedAt: new Date() }, { transaction: t });
  });
}

export async function permanentlyDeleteSellerAccount(userId: string): Promise<void> {
  const user = await User.findOne({ where: { id: userId, role: 'SELLER' } });
  if (!user) {
    throw Object.assign(new Error('Seller not found'), { status: 404 });
  }

  const profile = await SellerProfile.findOne({ where: { userId } });
  const products = await Product.findAll({ where: { sellerId: userId }, attributes: ['id', 'images'] });
  const productIds = products.map((p) => p.id);
  const variants = productIds.length
    ? await ProductVariant.findAll({ where: { productId: productIds }, attributes: ['images'] })
    : [];
  const reviews = productIds.length
    ? await Review.findAll({ where: { productId: productIds }, attributes: ['images'] })
    : [];

  const imageKeys = [
    ...(user.profileImage ? [user.profileImage] : []),
    ...products.flatMap((p) => p.images),
    ...variants.flatMap((v) => v.images),
    ...reviews.flatMap((r) => r.images),
    ...(profile ? Object.values(profile.kycDocuments).filter((v): v is string => Boolean(v)) : []),
    ...(profile
      ? Object.values(profile.brandDocuments).flatMap((set) => Object.values(set).filter((v): v is string => Boolean(v)))
      : []),
  ];

  await sequelize.transaction(async (t) => {
    await Session.destroy({ where: { actorType: 'user', actorId: userId }, transaction: t });
    await user.destroy({ transaction: t });
  });

  await Promise.all(
    imageKeys.map((key) =>
      deleteImage(key).catch((err) => console.error(`Failed to delete image ${key} for deleted seller ${userId}:`, err)),
    ),
  );
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

type ProfileWhere = Record<string | symbol, unknown>;

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

  const profileWhere: ProfileWhere = {};
  if (categoryId !== undefined) {
    profileWhere[Op.and] = literal(`"sellerProfile"."category_ids" @> '[${categoryId}]'::jsonb`);
  }
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
      ...(hasProfileFilter ? { where: profileWhere as Record<string, unknown>, required: true } : {}),
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
      include: [{ model: SellerProfile }],
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
      const conflict = await User.findOne({ where: { mobile: data.mobile, role: 'SELLER' }, transaction: t });
      if (conflict) {
        throw Object.assign(new Error('Mobile number already registered'), { status: 409 });
      }
    }

    if (data.email !== profile.email) {
      const emailConflict = await SellerProfile.findOne({
        where: { email: { [Op.iLike]: data.email }, userId: { [Op.ne]: user.id } },
        transaction: t,
      });
      if (emailConflict) {
        throw Object.assign(new Error('Email already registered'), { status: 409 });
      }
    }

    const previousPhoto = user.profileImage;
    const newPhoto = await commitSellerPhoto(normalizeImageKey(data.photo));

    await user.update(
      { mobile: data.mobile, countryCode: data.countryCode, fullName: data.fullName ?? null, profileImage: newPhoto },
      { transaction: t },
    );

    if (previousPhoto && previousPhoto !== newPhoto) {
      await deleteImage(previousPhoto).catch(() => {});
    }

    await profile.update(
      {
        businessName: data.businessName,
        email:        data.email,
        categoryIds:  data.categoryIds ?? [],
        bio:          data.bio ?? null,
        workingHours: (data.workingHours ?? {}) as Record<string, unknown>,
        lat:          data.lat,
        long:         data.long,
        address:      data.address ?? null,
      },
      { transaction: t },
    );

    return { user, profile };
  });
}

export async function getSellerSettings(userId: string): Promise<NotificationSettings> {
  const profile = await requireSellerProfile(userId);
  return profile.notificationSettings;
}

export async function updateSellerSettings(
  userId: string,
  settings: NotificationSettings,
): Promise<NotificationSettings> {
  const profile = await requireSellerProfile(userId);
  await profile.update({ notificationSettings: settings });
  return profile.notificationSettings;
}

function isTodayOrFuture(dateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return d >= today;
}

export async function getCustomDay(userId: string): Promise<CustomDayOverride | null> {
  const profile = await requireSellerProfile(userId);
  const override = profile.customDayOverride as CustomDayOverride | null;
  if (!override) return null;
  if (!isTodayOrFuture(override.date)) {
    await profile.update({ customDayOverride: null });
    return null;
  }
  return override;
}

export async function setCustomDay(userId: string, data: CustomDayOverride): Promise<CustomDayOverride> {
  if (!isTodayOrFuture(data.date)) {
    throw Object.assign(new Error('Date must be today or in the future'), { status: 400 });
  }
  const profile = await requireSellerProfile(userId);
  await profile.update({ customDayOverride: data });
  return data;
}

export async function clearCustomDay(userId: string): Promise<void> {
  const profile = await requireSellerProfile(userId);
  await profile.update({ customDayOverride: null });
}

export async function updateSellerBrands(id: string, brandIds: number[]): Promise<SellerProfile> {
  const profile = await requireSellerProfile(id);
  await profile.update({ brandIds });
  return profile;
}

export async function uploadSellerBrandDocument(
  sellerId: string,
  brandId: number,
  documentType: BrandDocumentType,
  file: Express.Multer.File,
): Promise<BrandDocuments> {
  const profile = await requireSellerProfile(sellerId);
  const brand = await Brand.findByPk(brandId);
  if (!brand) {
    throw Object.assign(new Error('Brand not found'), { status: 404 });
  }

  const key = await saveBrandDocument(file, sellerId, brandId, documentType);
  const existing = profile.brandDocuments[String(brandId)] ?? { certification: null, other: null };
  const brandDocuments: BrandDocuments = {
    ...profile.brandDocuments,
    [String(brandId)]: { ...existing, [documentType]: key },
  };
  await profile.update({ brandDocuments });
  return brandDocuments;
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
    include: [{ model: SellerProfile }],
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

export async function uploadSellerKycDocument(
  sellerId: string,
  documentType: KycDocumentType,
  file: Express.Multer.File,
): Promise<KycDocuments> {
  const profile = await requireSellerProfile(sellerId);
  const key = await saveKycDocument(file, sellerId, documentType);
  const kycDocuments: KycDocuments = { ...profile.kycDocuments, [documentType]: key };
  await profile.update({ kycDocuments });
  return kycDocuments;
}

export async function setSellerKycVerification(
  sellerId: string,
  verified: boolean,
  adminId: string,
): Promise<SellerProfile> {
  const profile = await requireSellerProfile(sellerId);

  if (verified) {
    if (!profile.kycDocuments.aadhar || !profile.kycDocuments.pan) {
      throw Object.assign(new Error('Aadhar and PAN documents are required before verification'), { status: 400 });
    }
    await profile.update({ isVerified: true, verifiedBy: adminId, verifiedAt: new Date() });
  } else {
    await profile.update({ isVerified: false, verifiedBy: null, verifiedAt: null });
  }

  try {
    await sendKycVerificationEmail(profile.email, profile.businessName, verified);
  } catch (err: unknown) {
    console.error('[setSellerKycVerification] failed to send notification email:', err);
  }

  return profile;
}
