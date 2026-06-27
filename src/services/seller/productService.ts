import type { InferType } from 'yup';
import { Op, literal } from 'sequelize';
import { Product } from '../../models/Product';
import { Category } from '../../models/Category';
import { ProductVariant } from '../../models/ProductVariant';
import type { createProductSchema, updateProductSchema } from '../../validation/seller/productSchemas';
import type { AttributeField } from '../../types';
import { normalizeImageKey } from '../../utils/imageStorage';
import sequelize from '../../config/database';

type CreateProductInput = InferType<typeof createProductSchema>;
type UpdateProductInput = InferType<typeof updateProductSchema>;

function validateAttributes(
  attributes: Record<string, unknown>,
  schema: AttributeField[],
): void {
  const errors: string[] = [];

  for (const field of schema) {
    const value = attributes[field.key];
    const isEmpty = value === undefined || value === null || value === '' ||
      (Array.isArray(value) && value.length === 0);

    if (field.required && isEmpty) {
      errors.push(`${field.label} is required`);
      continue;
    }

    if (!isEmpty && field.options && field.options.length > 0) {
      const allowed = field.options.map(o => o.value);
      if (field.type === 'multiselect' || field.type === 'color') {
        const values = Array.isArray(value) ? value : [value];
        const invalid = (values as string[]).filter(v => !allowed.includes(v));
        if (invalid.length > 0) {
          errors.push(`${field.label} contains invalid option(s): ${invalid.join(', ')}`);
        }
      } else if (field.type === 'select') {
        if (!allowed.includes(value as string)) {
          errors.push(`${field.label} must be one of: ${allowed.join(', ')}`);
        }
      }
    }
  }

  if (errors.length > 0) {
    throw Object.assign(new Error(errors.join('; ')), { status: 422 });
  }
}

async function requireOwnProduct(sellerId: string, productId: string): Promise<Product> {
  const product = await Product.findOne({ where: { id: productId, sellerId } });
  if (!product) {
    throw Object.assign(new Error('Product not found'), { status: 404 });
  }
  return product;
}

export async function createProduct(
  sellerId: string,
  data: CreateProductInput,
): Promise<Product> {
  const category = await Category.findByPk(data.categoryId);
  if (!category || !category.isActive) {
    throw Object.assign(new Error('Category not found'), { status: 404 });
  }

  if (category.attributeSchema && category.attributeSchema.length > 0) {
    validateAttributes(data.attributes as Record<string, unknown> ?? {}, category.attributeSchema);
  }

  const hasRows = Array.isArray(data.rows) && data.rows.length > 0;
  const variantStock = hasRows
    ? data.rows!.reduce((sum, row) => sum + row.stock, 0)
    : undefined;

  const product = await sequelize.transaction(async (t) => {
    const created = await Product.create({
      sellerId,
      categoryId:    data.categoryId,
      name:          data.name,
      description:   data.description,
      sellingPrice:  data.sellingPrice,
      mrp:           data.mrp ?? null,
      costPrice:     data.costPrice ?? null,
      stock:         variantStock ?? data.stock ?? 0,
      images:        (data.images ?? []).map(normalizeImageKey),
      attributes:    data.attributes ?? {},
      pickupAddress: data.pickupAddress ?? null,
      pickupLat:     data.pickupLat ?? null,
      pickupLong:    data.pickupLong ?? null,
    }, { transaction: t });

    if (hasRows) {
      const variants = data.rows!.map(row => ({
        productId:    created.id,
        attributes:   row.attributes as Record<string, unknown> ?? {},
        images:       (data.images ?? []).map(normalizeImageKey),
        stock:        row.stock,
        sellingPrice: data.sellingPrice,
        mrp:          data.mrp ?? null,
        isActive:     true,
      }));
      await ProductVariant.bulkCreate(variants, { transaction: t });
    }

    return created;
  });

  return product.reload({ include: [{ model: Category, attributes: ['id', 'name', 'slug', 'attributeSchema'] }] });
}

type ProductFilter = 'all' | 'visible' | 'hidden';
type ProductSortBy =
  | 'sort_newest'
  | 'sort_price_high_low'
  | 'sort_price_low_high'
  | 'sort_most_wishlisted'
  | 'sort_top_rated'
  | 'sort_stock_high_low'
  | 'sort_stock_low_high'
  | 'sort_visible_first'
  | 'sort_hidden_first'
  | 'sort_name_az';

function resolveOrder(sortBy: ProductSortBy): [string, string][] {
  switch (sortBy) {
    case 'sort_price_high_low':  return [['sellingPrice', 'DESC']];
    case 'sort_price_low_high':  return [['sellingPrice', 'ASC']];
    case 'sort_stock_high_low':  return [['stock', 'DESC']];
    case 'sort_stock_low_high':  return [['stock', 'ASC']];
    case 'sort_visible_first':   return [['isActive', 'DESC'], ['createdAt', 'DESC']];
    case 'sort_hidden_first':    return [['isActive', 'ASC'], ['createdAt', 'DESC']];
    case 'sort_name_az':         return [['name', 'ASC']];
    // sort_most_wishlisted and sort_top_rated fall back until those tables exist
    default:                     return [['createdAt', 'DESC']];
  }
}

export async function getSellerProducts(
  sellerId: string,
  page: number,
  limit: number,
  filter: ProductFilter = 'all',
  sortBy: ProductSortBy = 'sort_newest',
): Promise<{ rows: Product[]; count: number }> {
  const where: Record<string, unknown> = { sellerId };
  if (filter === 'visible') where.isActive = true;
  if (filter === 'hidden')  where.isActive = false;

  return Product.findAndCountAll({
    where,
    attributes: {
      include: [
        [
          literal('(SELECT COUNT(*)::int FROM product_variants WHERE product_id = "Product".id)'),
          'variantCount',
        ],
      ],
    },
    include: [{ model: Category, attributes: ['id', 'name', 'slug'] }],
    order: resolveOrder(sortBy),
    limit,
    offset: (page - 1) * limit,
  });
}

export async function getSellerProduct(sellerId: string, productId: string): Promise<Product> {
  const product = await Product.findOne({
    where: { id: productId, sellerId },
    include: [
      { model: Category, attributes: ['id', 'name', 'slug', 'attributeSchema'] },
      { model: ProductVariant, attributes: ['id'] },
    ],
  });
  if (!product) {
    throw Object.assign(new Error('Product not found'), { status: 404 });
  }
  return product;
}

export async function updateSellerProduct(
  sellerId: string,
  productId: string,
  data: UpdateProductInput,
): Promise<Product> {
  const product = await requireOwnProduct(sellerId, productId);

  const categoryId = data.categoryId ?? product.categoryId;
  const category = await Category.findByPk(categoryId);
  if (!category || !category.isActive) {
    throw Object.assign(new Error('Category not found'), { status: 404 });
  }

  const mergedAttributes = data.attributes !== undefined
    ? (data.attributes as Record<string, unknown>)
    : (product.attributes as Record<string, unknown>);

  if (category.attributeSchema && category.attributeSchema.length > 0) {
    validateAttributes(mergedAttributes, category.attributeSchema);
  }

  const hasVariants = await ProductVariant.count({ where: { productId: product.id } }) > 0;

  await product.update({
    ...(data.name          !== undefined && { name:          data.name }),
    ...(data.description   !== undefined && { description:   data.description }),
    ...(data.sellingPrice  !== undefined && { sellingPrice:  data.sellingPrice }),
    ...(data.mrp           !== undefined && { mrp:           data.mrp }),
    ...(data.costPrice     !== undefined && { costPrice:     data.costPrice }),
    ...(data.categoryId    !== undefined && { categoryId:    data.categoryId }),
    ...(!hasVariants && data.stock !== undefined && { stock: data.stock }),
    ...(data.images        !== undefined && { images:        data.images.map(normalizeImageKey) }),
    ...(data.attributes    !== undefined && { attributes:    data.attributes }),
    ...(data.pickupAddress !== undefined && { pickupAddress: data.pickupAddress }),
    ...(data.pickupLat     !== undefined && { pickupLat:     data.pickupLat }),
    ...(data.pickupLong    !== undefined && { pickupLong:    data.pickupLong }),
  });

  return product.reload({ include: [{ model: Category, attributes: ['id', 'name', 'slug', 'attributeSchema'] }] });
}

export async function toggleSellerProduct(sellerId: string, productId: string): Promise<Product> {
  const product = await requireOwnProduct(sellerId, productId);
  await product.update({ isActive: !product.isActive });
  return product;
}

export async function deleteSellerProduct(sellerId: string, productId: string): Promise<void> {
  const product = await requireOwnProduct(sellerId, productId);
  await product.destroy();
}
