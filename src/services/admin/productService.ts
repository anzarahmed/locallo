import { Op } from 'sequelize';
import { Product } from '../../models/Product';
import { Category } from '../../models/Category';
import { User } from '../../models/User';
import { SellerProfile } from '../../models/SellerProfile';
import { ProductVariant } from '../../models/ProductVariant';

const VALID_PRODUCT_SORT = new Set(['name', 'sellingPrice', 'stock', 'createdAt']);

interface ListProductsFilter {
  sellerId?: string;
  categoryId?: number;
  isActive?: boolean;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

const SELLER_INCLUDE = {
  model: User,
  as: 'seller',
  attributes: ['id', 'mobile', 'fullName'],
  include: [{ model: SellerProfile, attributes: ['businessName'] }],
};

const CATEGORY_INCLUDE = {
  model: Category,
  attributes: ['id', 'name', 'slug'],
};

export async function listAllProducts(
  filters: ListProductsFilter,
  page: number,
  limit: number,
): Promise<{ rows: Product[]; count: number }> {
  const where: Record<string, unknown> = {};

  if (filters.sellerId !== undefined)   where.sellerId   = filters.sellerId;
  if (filters.categoryId !== undefined) where.categoryId = filters.categoryId;
  if (filters.isActive !== undefined)   where.isActive   = filters.isActive;
  if (filters.search)                   where.name       = { [Op.iLike]: `%${filters.search}%` };

  const sortField = VALID_PRODUCT_SORT.has(filters.sortBy ?? '') ? (filters.sortBy as string) : 'createdAt';
  const sortOrder = filters.sortOrder ?? 'DESC';

  return Product.findAndCountAll({
    where,
    include: [SELLER_INCLUDE, CATEGORY_INCLUDE],
    order: [[sortField, sortOrder]],
    limit,
    offset: (page - 1) * limit,
  });
}

export async function getProductById(id: string): Promise<Product> {
  const product = await Product.findByPk(id, {
    include: [
      SELLER_INCLUDE,
      { model: Category, attributes: ['id', 'name', 'slug', 'attributeSchema'] },
      { model: ProductVariant, order: [['createdAt', 'ASC']] },
    ],
  });
  if (!product) {
    throw Object.assign(new Error('Product not found'), { status: 404 });
  }
  return product;
}

export async function toggleProduct(id: string): Promise<Product> {
  const product = await Product.findByPk(id);
  if (!product) {
    throw Object.assign(new Error('Product not found'), { status: 404 });
  }
  await product.update({ isActive: !product.isActive });
  return product;
}

export async function deleteProduct(id: string): Promise<void> {
  const product = await Product.findByPk(id);
  if (!product) {
    throw Object.assign(new Error('Product not found'), { status: 404 });
  }
  await product.destroy();
}
