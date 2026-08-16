import type { InferType } from 'yup';
import { Op, literal } from 'sequelize';
import { Product } from '../../models/Product';
import { Category } from '../../models/Category';
import { ProductVariant } from '../../models/ProductVariant';
import { SellerProfile } from '../../models/SellerProfile';
import type { createProductSchema, updateProductSchema } from '../../validation/seller/productSchemas';
import type { AttributeField } from '../../types';
import { normalizeImageKey, commitImages } from '../../utils/imageStorage';
import sequelize from '../../config/database';

type CreateProductInput = InferType<typeof createProductSchema>;
type UpdateProductInput = InferType<typeof updateProductSchema>;

function validateAttributes(
  attributes: Record<string, unknown>,
  schema: AttributeField[],
  skipVariantFields = false,
): void {
  const errors: string[] = [];

  for (const field of schema) {
    if (skipVariantFields && field.isVariant) continue;

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
  const profile = await SellerProfile.findOne({ where: { userId: sellerId } });
  const assignedIds: number[] = (profile?.categoryIds as number[] | null) ?? [];
  if (!assignedIds.includes(data.categoryId)) {
    throw Object.assign(new Error('Category not assigned to your profile'), { status: 403 });
  }

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

  const committedImages = await commitImages((data.images ?? []).map(normalizeImageKey));

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
      images:        committedImages,
      attributes:    data.attributes ?? {},
      pickupAddress: data.pickupAddress ?? null,
      pickupLat:     data.pickupLat ?? null,
      pickupLong:    data.pickupLong ?? null,
    }, { transaction: t });

    if (hasRows) {
      // Extract non-SD variant attrs from the top-level attributes so the backend
      // can merge them into each row (rows only carry the SD-specific value).
      const schema = (category.attributeSchema as AttributeField[]) ?? [];
      const sdKeys = new Set(schema.filter(f => f.isVariant && f.isStockDependent).map(f => f.key));
      const topAttrs = (data.attributes as Record<string, unknown>) ?? {};
      const sharedAttrs: Record<string, string> = {};
      for (const field of schema) {
        if (!field.isVariant || sdKeys.has(field.key)) continue;
        const val = topAttrs[field.key];
        if (Array.isArray(val) && val.length === 1) sharedAttrs[field.key] = String(val[0]);
        else if (typeof val === 'string' && val)    sharedAttrs[field.key] = val;
      }

      const images = committedImages;
      const variants = data.rows!.map(row => ({
        productId:    created.id,
        attributes:   { ...sharedAttrs, ...(row.attributes as Record<string, string>) },
        images,
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

const WISHLIST_COUNT_SQL = '(SELECT COUNT(*)::int FROM wishlists WHERE product_id = "Product".id)';
const REVIEW_COUNT_SQL = '(SELECT COUNT(*)::int FROM reviews WHERE product_id = "Product".id)';
const AVG_RATING_SQL = '(SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE product_id = "Product".id)';
const TOP_SCORE_SQL = `(${WISHLIST_COUNT_SQL} + (${AVG_RATING_SQL} * ${REVIEW_COUNT_SQL}))`;

function resolveOrder(sortBy: ProductSortBy): [ReturnType<typeof literal> | string, string][] {
  switch (sortBy) {
    case 'sort_price_high_low':  return [['sellingPrice', 'DESC']];
    case 'sort_price_low_high':  return [['sellingPrice', 'ASC']];
    case 'sort_stock_high_low':  return [['stock', 'DESC']];
    case 'sort_stock_low_high':  return [['stock', 'ASC']];
    case 'sort_visible_first':   return [['isActive', 'DESC'], ['createdAt', 'DESC']];
    case 'sort_hidden_first':    return [['isActive', 'ASC'], ['createdAt', 'DESC']];
    case 'sort_name_az':         return [['name', 'ASC']];
    case 'sort_most_wishlisted': return [[literal(WISHLIST_COUNT_SQL), 'DESC'], ['createdAt', 'DESC']];
    case 'sort_top_rated':       return [[literal(AVG_RATING_SQL), 'DESC'], [literal(REVIEW_COUNT_SQL), 'DESC'], ['createdAt', 'DESC']];
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

export async function getTopProducts(sellerId: string, limit: number): Promise<Product[]> {
  return Product.findAll({
    where: { sellerId },
    attributes: {
      include: [
        [literal(WISHLIST_COUNT_SQL), 'wishlistCount'],
        [literal(REVIEW_COUNT_SQL), 'reviewCount'],
        [literal(AVG_RATING_SQL), 'avgRating'],
      ],
    },
    order: [[literal(TOP_SCORE_SQL), 'DESC'], ['createdAt', 'DESC']],
    limit,
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

  const category = await Category.findByPk(product.categoryId);
  if (!category || !category.isActive) {
    throw Object.assign(new Error('Category not found'), { status: 404 });
  }

  const hasVariants = await ProductVariant.count({ where: { productId: product.id } }) > 0;

  const schema = (category.attributeSchema as AttributeField[]) ?? [];
  const variantKeys = new Set(schema.filter(f => f.isVariant).map(f => f.key));
  const existingAttrs = (product.attributes as Record<string, unknown>) ?? {};

  let mergedAttributes: Record<string, unknown> = existingAttrs;
  if (data.attributes !== undefined) {
    mergedAttributes = { ...existingAttrs };
    for (const [key, val] of Object.entries(data.attributes as Record<string, unknown>)) {
      if (!variantKeys.has(key)) mergedAttributes[key] = val;
    }
  }
  console.log('[updateProduct] existingAttrs:', JSON.stringify(existingAttrs));
  console.log('[updateProduct] data.attributes:', JSON.stringify(data.attributes));
  console.log('[updateProduct] variantKeys:', [...variantKeys]);
  console.log('[updateProduct] mergedAttributes:', JSON.stringify(mergedAttributes));

  if (schema.length > 0) {
    validateAttributes(mergedAttributes, schema, hasVariants);
  }

  await product.update({
    ...(data.name          !== undefined && { name:          data.name }),
    ...(data.description   !== undefined && { description:   data.description }),
    ...(data.sellingPrice  !== undefined && { sellingPrice:  data.sellingPrice }),
    ...(data.mrp           !== undefined && { mrp:           data.mrp }),
    ...(data.costPrice     !== undefined && { costPrice:     data.costPrice }),

    ...(!hasVariants && data.stock !== undefined && { stock: data.stock }),
    ...(data.images        !== undefined && { images:        await commitImages(data.images.map(normalizeImageKey)) }),
    ...(data.attributes    !== undefined && { attributes:    mergedAttributes }),
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
