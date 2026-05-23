import type { InferType } from 'yup';
import { Op } from 'sequelize';
import { Product } from '../../models/Product';
import { Category } from '../../models/Category';
import type { createProductSchema, updateProductSchema } from '../../validation/seller/productSchemas';
import type { AttributeField } from '../../types';

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

async function requireOwnProduct(sellerId: string, productId: number): Promise<Product> {
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

  const product = await Product.create({
    sellerId,
    categoryId:    data.categoryId,
    name:          data.name,
    description:   data.description,
    sellingPrice:  data.sellingPrice,
    mrp:           data.mrp ?? null,
    costPrice:     data.costPrice ?? null,
    stock:         data.stock,
    images:        data.images,
    attributes:    data.attributes ?? {},
    pickupAddress: data.pickupAddress ?? null,
    pickupLat:     data.pickupLat ?? null,
    pickupLong:    data.pickupLong ?? null,
  });

  return product.reload({ include: [{ model: Category, attributes: ['id', 'name', 'slug', 'attributeSchema'] }] });
}

export async function getSellerProducts(
  sellerId: string,
  page: number,
  limit: number,
  isActive?: boolean,
): Promise<{ rows: Product[]; count: number }> {
  const where: Record<string, unknown> = { sellerId };
  if (isActive !== undefined) where.isActive = isActive;

  return Product.findAndCountAll({
    where,
    include: [{ model: Category, attributes: ['id', 'name', 'slug'] }],
    order: [['createdAt', 'DESC']],
    limit,
    offset: (page - 1) * limit,
  });
}

export async function getSellerProduct(sellerId: string, productId: number): Promise<Product> {
  const product = await Product.findOne({
    where: { id: productId, sellerId },
    include: [{ model: Category, attributes: ['id', 'name', 'slug', 'attributeSchema'] }],
  });
  if (!product) {
    throw Object.assign(new Error('Product not found'), { status: 404 });
  }
  return product;
}

export async function updateSellerProduct(
  sellerId: string,
  productId: number,
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

  await product.update({
    ...(data.name          !== undefined && { name:          data.name }),
    ...(data.description   !== undefined && { description:   data.description }),
    ...(data.sellingPrice  !== undefined && { sellingPrice:  data.sellingPrice }),
    ...(data.mrp           !== undefined && { mrp:           data.mrp }),
    ...(data.costPrice     !== undefined && { costPrice:     data.costPrice }),
    ...(data.categoryId    !== undefined && { categoryId:    data.categoryId }),
    ...(data.stock         !== undefined && { stock:         data.stock }),
    ...(data.images        !== undefined && { images:        data.images }),
    ...(data.attributes    !== undefined && { attributes:    data.attributes }),
    ...(data.pickupAddress !== undefined && { pickupAddress: data.pickupAddress }),
    ...(data.pickupLat     !== undefined && { pickupLat:     data.pickupLat }),
    ...(data.pickupLong    !== undefined && { pickupLong:    data.pickupLong }),
  });

  return product.reload({ include: [{ model: Category, attributes: ['id', 'name', 'slug', 'attributeSchema'] }] });
}

export async function toggleSellerProduct(sellerId: string, productId: number): Promise<Product> {
  const product = await requireOwnProduct(sellerId, productId);
  await product.update({ isActive: !product.isActive });
  return product;
}

export async function deleteSellerProduct(sellerId: string, productId: number): Promise<void> {
  const product = await requireOwnProduct(sellerId, productId);
  await product.destroy();
}
