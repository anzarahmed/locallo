import type { InferType } from 'yup';
import sequelize from '../config/database';
import { User } from '../models/User';
import { SellerProfile } from '../models/SellerProfile';
import type { createSellerSchema } from '../validation/sellerSchemas';

type CreateSellerInput = InferType<typeof createSellerSchema>;

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

export async function getSellerList(
  limit: number,
  offset: number,
): Promise<{ sellers: User[]; total: number }> {
  const { count, rows } = await User.findAndCountAll({
    where: { role: 'SELLER' },
    include: [SellerProfile],
    limit,
    offset,
    order: [['id', 'DESC']], // Orders by newest records first; you can replace 'id' with 'createdAt' if defined
  });

  return { sellers: rows, total: count };
}