import type { InferType } from 'yup';
import { Product } from '../../models/Product';
import { ProductVariant } from '../../models/ProductVariant';
import { Category } from '../../models/Category';
import type { createVariantSchema, updateVariantSchema, createBatchVariantSchema } from '../../validation/seller/variantSchemas';
import type { AttributeField } from '../../types';
import { normalizeImageKey, commitImages } from '../../utils/imageStorage';

export async function syncProductStock(productId: string): Promise<void> {
  const total = ((await ProductVariant.sum('stock', { where: { productId } })) as number | null) ?? 0;
  await Product.update({ stock: total }, { where: { id: productId } });
}

async function syncProductVariantAttrs(productId: string): Promise<void> {
  const product = await Product.findByPk(productId);
  if (!product) return;

  const category = await Category.findByPk(product.categoryId as number);
  const schema = (category?.attributeSchema as AttributeField[] | undefined) ?? [];
  const variantFields = schema.filter(f => f.isVariant);
  if (variantFields.length === 0) return;

  const variants = await ProductVariant.findAll({ where: { productId } });
  const attrs = { ...(product.attributes as Record<string, unknown>) };

  for (const field of variantFields) {
    const seen = new Set<string>();
    for (const v of variants) {
      const val = (v.attributes as Record<string, unknown>)[field.key];
      if (val !== undefined && val !== null && val !== '') seen.add(String(val));
    }
    attrs[field.key] = Array.from(seen);
  }

  await product.update({ attributes: attrs });
}

type CreateVariantInput = InferType<typeof createVariantSchema>;
type UpdateVariantInput = InferType<typeof updateVariantSchema>;
type CreateBatchVariantInput = InferType<typeof createBatchVariantSchema>;

async function requireOwnProduct(sellerId: string, productId: string): Promise<Product> {
  const product = await Product.findOne({
    where: { id: productId, sellerId },
    include: [{ model: Category, attributes: ['id', 'name', 'slug', 'attributeSchema'] }],
  });
  if (!product) {
    throw Object.assign(new Error('Product not found'), { status: 404 });
  }
  return product;
}

async function requireOwnVariant(productId: string, variantId: string): Promise<ProductVariant> {
  const variant = await ProductVariant.findOne({ where: { id: variantId, productId } });
  if (!variant) {
    throw Object.assign(new Error('Variant not found'), { status: 404 });
  }
  return variant;
}

function getVariantKeys(product: Product): string[] {
  const schema = (product.category?.attributeSchema as AttributeField[] | undefined) ?? [];
  return schema.filter(f => f.isVariant).map(f => f.key);
}

function getComboKey(attrs: Record<string, unknown>, variantKeys: string[]): string {
  return variantKeys
    .map(key => `${key}:${String(attrs[key] ?? '').trim().toLowerCase()}`)
    .sort()
    .join('|');
}

export async function getProductVariants(
  productId: string,
  sellerId: string,
): Promise<{ product: Product; variants: ProductVariant[] }> {
  const product = await requireOwnProduct(sellerId, productId);
  const variants = await ProductVariant.findAll({
    where: { productId },
    order: [['createdAt', 'ASC']],
  });
  return { product, variants };
}

export async function createVariant(
  productId: string,
  sellerId: string,
  data: CreateVariantInput,
): Promise<ProductVariant> {
  const product = await requireOwnProduct(sellerId, productId);

  const variantKeys = getVariantKeys(product);
  if (variantKeys.length > 0) {
    const existingVariants = await ProductVariant.findAll({ where: { productId } });
    const existingKeys = new Set(
      existingVariants.map(v => getComboKey(v.attributes as Record<string, unknown>, variantKeys)),
    );
    const newKey = getComboKey(data.attributes as Record<string, unknown>, variantKeys);
    if (existingKeys.has(newKey)) {
      throw Object.assign(new Error('A variant with this combination already exists'), { status: 409 });
    }
  }

  const variant = await ProductVariant.create({
    productId,
    attributes:   data.attributes,
    images:       await commitImages((data.images ?? []).map(normalizeImageKey)),
    stock:        data.stock,
    sellingPrice: data.sellingPrice,
    mrp:          data.mrp ?? null,
    isActive:     data.isActive ?? true,
  });
  await syncProductStock(productId);
  await syncProductVariantAttrs(productId);
  return variant;
}

export async function createBatchVariants(
  productId: string,
  sellerId: string,
  data: CreateBatchVariantInput,
): Promise<ProductVariant[]> {
  const product = await requireOwnProduct(sellerId, productId);

  const images = await commitImages((data.images ?? []).map(normalizeImageKey));
  const sharedAttrs = (data.attributes as Record<string, string>) ?? {};
  const rowAttrs = data.rows.map(row => ({ ...sharedAttrs, ...(row.attributes as Record<string, string>) }));

  const variantKeys = getVariantKeys(product);
  if (variantKeys.length > 0) {
    const existingVariants = await ProductVariant.findAll({ where: { productId } });
    const seenKeys = new Set(
      existingVariants.map(v => getComboKey(v.attributes as Record<string, unknown>, variantKeys)),
    );
    for (const attrs of rowAttrs) {
      const key = getComboKey(attrs, variantKeys);
      if (seenKeys.has(key)) {
        throw Object.assign(new Error('A variant with this combination already exists'), { status: 409 });
      }
      seenKeys.add(key);
    }
  }

  const variants = await Promise.all(
    rowAttrs.map((attrs, i) =>
      ProductVariant.create({
        productId,
        attributes:   attrs,
        images,
        stock:        data.rows[i].stock,
        sellingPrice: data.sellingPrice,
        mrp:          data.mrp ?? null,
        isActive:     data.isActive ?? true,
      }),
    ),
  );

  await syncProductStock(productId);
  await syncProductVariantAttrs(productId);
  return variants;
}

export async function updateVariant(
  productId: string,
  variantId: string,
  sellerId: string,
  data: UpdateVariantInput,
): Promise<ProductVariant> {
  await requireOwnProduct(sellerId, productId);
  const variant = await requireOwnVariant(productId, variantId);

  await variant.update({
    ...(data.images       !== undefined && { images:       await commitImages(data.images.map(normalizeImageKey)) }),
    ...(data.stock        !== undefined && { stock:        data.stock }),
    ...(data.sellingPrice !== undefined && { sellingPrice: data.sellingPrice }),
    ...(data.mrp          !== undefined && { mrp:          data.mrp }),
    ...(data.isActive     !== undefined && { isActive:     data.isActive }),
  });

  await syncProductStock(productId);
  return variant;
}

export async function deleteVariant(
  productId: string,
  variantId: string,
  sellerId: string,
): Promise<void> {
  await requireOwnProduct(sellerId, productId);
  const variant = await requireOwnVariant(productId, variantId);
  await variant.destroy();
  await syncProductStock(productId);
  await syncProductVariantAttrs(productId);
}

export async function toggleVariant(
  productId: string,
  variantId: string,
  sellerId: string,
): Promise<ProductVariant> {
  await requireOwnProduct(sellerId, productId);
  const variant = await requireOwnVariant(productId, variantId);
  await variant.update({ isActive: !variant.isActive });
  return variant;
}

