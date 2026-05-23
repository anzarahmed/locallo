import { Op } from 'sequelize';
import { Product } from '../../models/Product';
import { Category } from '../../models/Category';
import { User } from '../../models/User';
import { SellerProfile } from '../../models/SellerProfile';

interface BrowseFilter {
  categoryId?: number;
  search?: string;
}

const SAFE_PRODUCT_ATTRIBUTES = [
  'id', 'sellerId', 'categoryId', 'name', 'description',
  'sellingPrice', 'mrp', 'stock', 'images', 'attributes',
  'pickupAddress', 'pickupLat', 'pickupLong', 'isActive',
  'createdAt', 'updatedAt',
];

export async function browseProducts(
  filters: BrowseFilter,
  page: number,
  limit: number,
): Promise<{ rows: Product[]; count: number }> {
  const where: Record<string, unknown> = { isActive: true };

  if (filters.categoryId !== undefined) where.categoryId = filters.categoryId;
  if (filters.search)                   where.name       = { [Op.iLike]: `%${filters.search}%` };

  return Product.findAndCountAll({
    attributes: SAFE_PRODUCT_ATTRIBUTES,
    where,
    include: [{ model: Category, attributes: ['id', 'name', 'slug'] }],
    order: [['createdAt', 'DESC']],
    limit,
    offset: (page - 1) * limit,
  });
}

export async function getProductDetail(id: number): Promise<Product> {
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
