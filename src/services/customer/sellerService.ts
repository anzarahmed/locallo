import { QueryTypes } from 'sequelize';
import sequelize from '../../config/database';
import { User } from '../../models/User';
import { SellerProfile } from '../../models/SellerProfile';
import { Category } from '../../models/Category';
import { Brand } from '../../models/Brand';
import { Product } from '../../models/Product';
import type { CustomDayOverride, CustomDayTime, DayOfWeek, WorkingHours } from '../../types';

const DAYS: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export interface TodayWorkingHours {
  day: DayOfWeek;
  date: string;
  isSpecialHours: boolean;
  time: CustomDayTime;
}

export async function getTodayWorkingHours(sellerId: string): Promise<TodayWorkingHours> {
  const profile = await SellerProfile.findOne({
    where: { userId: sellerId },
    attributes: ['workingHours', 'customDayOverride'],
  });

  if (!profile) {
    throw Object.assign(new Error('Seller not found'), { status: 404 });
  }

  return resolveTodayWorkingHours(profile.workingHours as WorkingHours, profile.customDayOverride as CustomDayOverride | null);
}

function resolveTodayWorkingHours(
  workingHours: WorkingHours,
  override: CustomDayOverride | null,
): TodayWorkingHours {
  const now = new Date();
  const day = DAYS[now.getDay()];
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  if (override && override.date === date) {
    return { day, date, isSpecialHours: true, time: override.time };
  }

  return { day, date, isSpecialHours: false, time: workingHours[day] };
}

interface CategoryRef {
  id: number;
  name: string;
  slug: string;
}

interface BrandRef {
  id: number;
  name: string;
  slug: string;
}

export interface SellerDetails {
  id: string;
  businessName: string;
  fullName: string | null;
  photo: string | null;
  bio: string | null;
  isVerified: boolean;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  lat: number;
  long: number;
  categories: CategoryRef[];
  brands: BrandRef[];
  workingHours: WorkingHours;
  todayHours: TodayWorkingHours;
  rating: { average: number; count: number };
  productCount: number;
}

async function resolveCategories(ids: number[]): Promise<CategoryRef[]> {
  if (ids.length === 0) return [];
  const rows = await Category.findAll({ where: { id: ids }, attributes: ['id', 'name', 'slug'] });
  return rows.map((c) => ({ id: c.id, name: c.name, slug: c.slug }));
}

async function resolveBrands(ids: number[]): Promise<BrandRef[]> {
  if (ids.length === 0) return [];
  const rows = await Brand.findAll({ where: { id: ids }, attributes: ['id', 'name', 'slug'] });
  return rows.map((b) => ({ id: b.id, name: b.name, slug: b.slug }));
}

async function getSellerRating(sellerId: string): Promise<{ average: number; count: number }> {
  const [stats] = await sequelize.query<{ average: number | null; count: string }>(
    `SELECT AVG(r.rating)::float AS average, COUNT(r.id) AS count
       FROM reviews r
       JOIN products p ON p.id = r.product_id
      WHERE p.seller_id = :sellerId`,
    { replacements: { sellerId }, type: QueryTypes.SELECT },
  );

  return {
    average: stats?.average ? Math.round(stats.average * 10) / 10 : 0,
    count: Number(stats?.count ?? 0),
  };
}

export async function getSellerDetails(sellerId: string): Promise<SellerDetails> {
  const user = await User.findOne({
    where: { id: sellerId, role: 'SELLER', isActive: true },
    include: [{ model: SellerProfile }],
  });

  if (!user || !user.sellerProfile) {
    throw Object.assign(new Error('Seller not found'), { status: 404 });
  }

  const profile = user.sellerProfile;
  const workingHours = (profile.workingHours ?? {}) as WorkingHours;

  const [categories, brands, rating, productCount] = await Promise.all([
    resolveCategories(profile.categoryIds ?? []),
    resolveBrands(profile.brandIds ?? []),
    getSellerRating(sellerId),
    Product.count({ where: { sellerId, isActive: true } }),
  ]);

  return {
    id: user.id,
    businessName: profile.businessName,
    fullName: user.fullName,
    photo: user.profileImage,
    bio: profile.bio,
    isVerified: profile.isVerified,
    address: profile.address,
    city: profile.city,
    state: profile.state,
    pincode: profile.pincode,
    lat: profile.lat,
    long: profile.long,
    categories,
    brands,
    workingHours,
    todayHours: resolveTodayWorkingHours(workingHours, profile.customDayOverride as CustomDayOverride | null),
    rating,
    productCount,
  };
}
