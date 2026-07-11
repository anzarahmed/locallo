import { Op, literal } from 'sequelize';
import { Product } from '../../models/Product';
import { Category } from '../../models/Category';
import { User } from '../../models/User';
import { SellerProfile } from '../../models/SellerProfile';

interface BrowseFilter {
  categoryId?: number;
  search?: string;
  lat?: number;
  lng?: number;
}

const TRENDING_LIMIT = 15;
const TRENDING_ATTRIBUTES = ['id', 'name', 'mrp', 'sellingPrice', 'images'];

const SAFE_PRODUCT_ATTRIBUTES = [
  'id', 'sellerId', 'categoryId', 'name', 'description',
  'sellingPrice', 'mrp', 'stock', 'images', 'attributes',
  'pickupAddress', 'pickupLat', 'pickupLong', 'isActive',
  'createdAt', 'updatedAt',
];

const SELLER_LAT_SUBQUERY = '(SELECT lat FROM seller_profiles WHERE seller_profiles.user_id = "Product"."seller_id")';
const SELLER_LONG_SUBQUERY = '(SELECT long FROM seller_profiles WHERE seller_profiles.user_id = "Product"."seller_id")';

function distanceExpression(lat: number, lng: number): ReturnType<typeof literal> {
  return literal(
    `6371 * acos(least(1, greatest(-1, ` +
    `cos(radians(${lat})) * cos(radians(${SELLER_LAT_SUBQUERY})) * cos(radians(${SELLER_LONG_SUBQUERY}) - radians(${lng})) ` +
    `+ sin(radians(${lat})) * sin(radians(${SELLER_LAT_SUBQUERY})))))`,
  );
}

export async function browseProducts(
  filters: BrowseFilter,
  page: number,
  limit: number,
): Promise<{ rows: Product[]; count: number }> {
  const where: Record<string, unknown> = { isActive: true };

  if (filters.categoryId !== undefined) where.categoryId = filters.categoryId;
  if (filters.search)                   where.name       = { [Op.iLike]: `%${filters.search}%` };

  const hasLocation = filters.lat !== undefined && filters.lng !== undefined;

  const attributes = hasLocation
    ? [...TRENDING_ATTRIBUTES, [distanceExpression(filters.lat as number, filters.lng as number), 'distanceKm']]
    : TRENDING_ATTRIBUTES;

  const order = hasLocation
    ? [[literal('"distanceKm"'), 'ASC'], ['createdAt', 'DESC']]
    : [['createdAt', 'DESC']];

  return Product.findAndCountAll({
    attributes: attributes as never,
    where,
    order: order as never,
    limit,
    offset: (page - 1) * limit,
  });
}

export async function getProductDetail(id: string): Promise<Product> {
  const product = await Product.findOne({
    attributes: SAFE_PRODUCT_ATTRIBUTES,
    where: { id, isActive: true },
    include: [
      {
        model: Category,
        attributes: ['id', 'name', 'slug', 'attributeSchema'],
      },
      {
        model: User,
        as: 'seller',
        attributes: [],
        include: [{
          model: SellerProfile,
          attributes: ['businessName', 'address', 'lat', 'long'],
        }],
      },
    ],
  });

  if (!product) {
    throw Object.assign(new Error('Product not found'), { status: 404 });
  }
  return product;
}

export async function getTrendingProducts(): Promise<Product[]> {
  return Product.findAll({
    attributes: TRENDING_ATTRIBUTES,
    where: { isActive: true },
    order: [['createdAt', 'DESC']],
    limit: TRENDING_LIMIT,
  });
}
