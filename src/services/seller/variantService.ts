import type { InferType } from 'yup';
import { Op, type Transaction } from 'sequelize';
import sequelize from '../../config/database';
import { Product } from '../../models/Product';
import { ProductVariant } from '../../models/ProductVariant';
import { Category } from '../../models/Category';
import type { createVariantSchema, updateVariantSchema, createBatchVariantSchema } from '../../validation/seller/variantSchemas';
import type { AttributeField } from '../../types';
import { normalizeImageKey, commitImages } from '../../utils/imageStorage';
import { normalizeFreeTextAttributes } from '../../utils/attributeDisplay';
import { getComboKey, getGroupAttributeKeys, getStockDependentField, newGroupLabels } from '../../utils/variantGroups';
import { assertCanAdd, consumeGroupUnits, notifyLimitThreshold, type LimitUsage } from './productLimitService';
import { recordPurchase } from './purchaseService';
import { ProductBoost } from '../../models/ProductBoost';
import { cancelPendingBoosts, completeLiveBoosts, hasLiveBoost } from './boostGuards';

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
    include: [{ model: Category, attributes: ['id', 'name', 'slug', 'attributeSchema', 'productLimit'] }],
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

async function hasOtherActiveVariant(productId: string, variantId: string): Promise<boolean> {
  const count = await ProductVariant.count({
    where: { productId, isActive: true, id: { [Op.ne]: variantId } },
  });
  return count > 0;
}

function otherListedIds(boosts: ProductBoost[], variantId: string): string[] {
  return [...new Set(boosts.flatMap(b => b.variantIds ?? []))].filter(id => id !== variantId);
}

export const BOOST_ENDS_ON_DELETE_MESSAGE =
  "The product is boosted, deletion will end the product's promotion. Are you sure you want to delete it?";

// Live paid boosts for which this is the last visible listed option — removing it leaves
// them nothing to show.
async function findBoostsEndedBy(productId: string, variantId: string): Promise<string[]> {
  const boosts = await ProductBoost.findAll({
    where: { productId, status: 'active', paymentStatus: 'paid', variantIds: { [Op.contains]: [variantId] } },
  });
  if (boosts.length === 0) return [];

  const candidateIds = otherListedIds(boosts, variantId);
  const activeIds = new Set(candidateIds.length === 0 ? [] : (await ProductVariant.findAll({
    where: { id: { [Op.in]: candidateIds }, productId, isActive: true },
    attributes: ['id'],
  })).map(v => v.id));

  return boosts
    .filter(b => !(b.variantIds ?? []).some(id => id !== variantId && activeIds.has(id)))
    .map(b => b.id);
}

export const BOOST_ENDS_ON_HIDE_MESSAGE =
  "The product is boosted, hiding this variant will end the product's promotion. Are you sure you want to hide it?";

// Hiding an option of a promoted group is fine while another listed option stays visible;
// the ID is deliberately left in variant_ids so unhiding restores it. Hiding the last one
// ends the boost, so (like deleteVariant) it needs the seller's confirmation — older app
// builds don't send endBoost, so they get a 409 instead of silently ending a paid boost.
async function resolveBoostsEndedByHide(productId: string, variantId: string, endBoost: boolean): Promise<string[]> {
  const endingBoostIds = await findBoostsEndedBy(productId, variantId);
  if (endingBoostIds.length > 0 && !endBoost) {
    throw Object.assign(new Error(BOOST_ENDS_ON_HIDE_MESSAGE), { status: 409 });
  }
  return endingBoostIds;
}

// Hiding the product's last visible variant hides the product from customers, so it ends
// every boost on the product like hiding the product does — whole-product boosts
// (variant_ids NULL) included, which findBoostsEndedBy never matches.
async function assertLastVisibleHideConfirmed(productId: string, endBoost: boolean): Promise<void> {
  if (!endBoost && (await hasLiveBoost(productId))) {
    throw Object.assign(new Error(BOOST_ENDS_ON_HIDE_MESSAGE), { status: 409 });
  }
}

async function endProductBoosts(productId: string, t: Transaction): Promise<{ cancelledBoosts: number; endedBoosts: number }> {
  const endedBoosts = await completeLiveBoosts({ productId }, t);
  const cancelledBoosts = await cancelPendingBoosts({ productId }, t);
  return { cancelledBoosts, endedBoosts };
}

// variant_ids keeps a deleted ID (it simply stops resolving). variant_id is only a display
// anchor whose FK is ON DELETE SET NULL, and older app builds read a null anchor as "whole
// product", so it moves to a surviving listed option first. A boost left with no visible
// listed option can't be shown; live paid ones were already completed by deleteVariant,
// so this only cancels unpaid (pending) ones before the seller can pay for them.
async function detachDeletedOptionFromBoosts(productId: string, variantId: string, t: Transaction): Promise<number> {
  const boosts = await ProductBoost.findAll({
    where: { productId, status: { [Op.in]: ['pending', 'active'] }, variantIds: { [Op.contains]: [variantId] } },
    transaction: t,
  });
  if (boosts.length === 0) return 0;

  const candidateIds = otherListedIds(boosts, variantId);
  const survivors = candidateIds.length === 0 ? [] : await ProductVariant.findAll({
    where: { id: { [Op.in]: candidateIds }, productId },
    attributes: ['id', 'isActive', 'createdAt'],
    order: [['isActive', 'DESC'], ['createdAt', 'ASC'], ['id', 'ASC']],
    transaction: t,
  });

  let cancelled = 0;
  for (const boost of boosts) {
    const listed = new Set(boost.variantIds ?? []);
    const listedSurvivors = survivors.filter(v => v.id !== variantId && listed.has(v.id));
    if (boost.status === 'pending' && !listedSurvivors.some(v => v.isActive)) {
      cancelled += await cancelPendingBoosts({ id: boost.id }, t);
      continue;
    }
    if (boost.variantId === variantId && listedSurvivors.length > 0) {
      await boost.update({ variantId: listedSurvivors[0].id }, { transaction: t });
    }
  }
  return cancelled;
}

// Hiding the last visible listed option of an unpaid boost cancels it (a live paid boost
// is completed by the caller after resolveBoostsEndedByHide); its IDs stay untouched.
async function cancelPendingBoostsLeftHidden(productId: string, hiddenId: string, t: Transaction): Promise<number> {
  const pending = await ProductBoost.findAll({
    where: { productId, status: 'pending', variantIds: { [Op.contains]: [hiddenId] } },
    transaction: t,
  });
  if (pending.length === 0) return 0;

  const candidateIds = otherListedIds(pending, hiddenId);
  const visibleIds = new Set(candidateIds.length === 0 ? [] : (await ProductVariant.findAll({
    where: { id: { [Op.in]: candidateIds }, productId, isActive: true },
    attributes: ['id'],
    transaction: t,
  })).map(v => v.id));

  const emptied = pending
    .filter(b => !(b.variantIds ?? []).some(id => id !== hiddenId && visibleIds.has(id)))
    .map(b => b.id);
  return emptied.length > 0 ? cancelPendingBoosts({ id: { [Op.in]: emptied } }, t) : 0;
}

function getVariantKeys(product: Product): string[] {
  const schema = (product.category?.attributeSchema as AttributeField[] | undefined) ?? [];
  return schema.filter(f => f.isVariant).map(f => f.key);
}

// Options of the same non-stock-dependent attributes (e.g. all sizes of one color) are
// treated as one visual "group" sharing a single image set — mirrors the grouping the
// seller panel already computes client-side via groupVariants()/sdField in VariantList.
function findGroupSiblings(
  product: Product,
  targetVariant: ProductVariant,
  allVariants: ProductVariant[],
): ProductVariant[] {
  const schema = (product.category?.attributeSchema as AttributeField[] | undefined) ?? [];
  if (!getStockDependentField(schema)) return [];

  const groupKeys = getGroupAttributeKeys(schema);
  const targetKey = getComboKey(targetVariant.attributes as Record<string, unknown>, groupKeys);

  return allVariants.filter(v =>
    v.id !== targetVariant.id &&
    getComboKey(v.attributes as Record<string, unknown>, groupKeys) === targetKey,
  );
}

export function getGroupOptions(
  product: Product,
  anchor: ProductVariant,
  activeVariants: ProductVariant[],
): ProductVariant[] {
  return [anchor, ...findGroupSiblings(product, anchor, activeVariants)];
}

// Same grouping as findGroupSiblings, but starting from the shared (non-SD) attributes
// directly rather than an existing variant instance — used when adding a new option
// (e.g. a new size) to an already-existing group via createBatchVariants.
function findGroupSiblingsByAttrs(
  product: Product,
  groupAttrs: Record<string, unknown>,
  allVariants: ProductVariant[],
): ProductVariant[] {
  const schema = (product.category?.attributeSchema as AttributeField[] | undefined) ?? [];
  if (!getStockDependentField(schema)) return [];

  const groupKeys = getGroupAttributeKeys(schema);
  if (groupKeys.length === 0) return [];
  const targetKey = getComboKey(groupAttrs, groupKeys);

  return allVariants.filter(v => getComboKey(v.attributes as Record<string, unknown>, groupKeys) === targetKey);
}

// variant_ids is set when the boost is created, so an option added to a promoted group later
// has to be appended here or it never shows as boosted. Whole-product boosts (NULL) already
// cover every option and never match the overlap.
async function addNewOptionsToGroupBoosts(
  product: Product,
  newVariants: ProductVariant[],
  existingVariants: ProductVariant[],
  t: Transaction,
): Promise<void> {
  const additions = new Map<string, { boost: ProductBoost; ids: string[] }>();
  for (const variant of newVariants) {
    const siblingIds = findGroupSiblings(product, variant, existingVariants).map(v => v.id);
    if (siblingIds.length === 0) continue;

    const boosts = await ProductBoost.findAll({
      where: {
        productId: product.id,
        status: { [Op.in]: ['pending', 'active'] },
        variantIds: { [Op.overlap]: siblingIds },
      },
      transaction: t,
    });
    for (const boost of boosts) {
      const entry = additions.get(boost.id) ?? { boost, ids: [] };
      entry.ids.push(variant.id);
      additions.set(boost.id, entry);
    }
  }

  for (const { boost, ids } of additions.values()) {
    await boost.update({ variantIds: [...new Set([...(boost.variantIds ?? []), ...ids])] }, { transaction: t });
  }
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
  const existingVariants = await ProductVariant.findAll({ where: { productId } });
  if (variantKeys.length > 0) {
    const existingKeys = new Set(
      existingVariants.map(v => getComboKey(v.attributes as Record<string, unknown>, variantKeys)),
    );
    const newKey = getComboKey(data.attributes as Record<string, unknown>, variantKeys);
    if (existingKeys.has(newKey)) {
      throw Object.assign(new Error('A variant with this combination already exists'), { status: 409 });
    }
  }

  const schema = (product.category?.attributeSchema as AttributeField[] | undefined) ?? [];
  // Hidden options still count as existing, so adding a size to a hidden group is free.
  const openedGroups = newGroupLabels(
    schema,
    [data.attributes as Record<string, unknown>],
    existingVariants.map(v => v.attributes as Record<string, unknown>),
  );
  await assertCanAdd(sellerId, product.category, openedGroups.length);

  const images = await commitImages((data.images ?? []).map(normalizeImageKey));
  let limitUsage: LimitUsage | null = null;
  const variant = await sequelize.transaction(async (t) => {
    const created = await ProductVariant.create({
      productId,
      attributes:   normalizeFreeTextAttributes(data.attributes as Record<string, unknown>, schema),
      images,
      stock:        data.stock,
      sellingPrice: data.sellingPrice,
      mrp:          data.mrp ?? null,
      isActive:     data.isActive ?? true,
    }, { transaction: t });
    await addNewOptionsToGroupBoosts(product, [created], existingVariants, t);
    limitUsage = await consumeGroupUnits(
      t,
      { sellerId, category: product.category, productId, productName: product.name },
      openedGroups,
    );
    return created;
  });
  notifyLimitThreshold(limitUsage);
  await syncProductStock(productId);
  await syncProductVariantAttrs(productId);

  await recordPurchase({
    sellerId,
    productId,
    variantId:   variant.id,
    quantity:    variant.stock,
    stockBefore: 0,
    stockAfter:  variant.stock,
    productName: product.name,
    variantInfo: variant.attributes as Record<string, unknown>,
    costPriceAtPurchase: product.costPrice,
  });

  return variant;
}

export async function createBatchVariants(
  productId: string,
  sellerId: string,
  data: CreateBatchVariantInput,
): Promise<ProductVariant[]> {
  const product = await requireOwnProduct(sellerId, productId);

  const batchSchema = (product.category?.attributeSchema as AttributeField[] | undefined) ?? [];
  const sharedAttrs = (data.attributes as Record<string, string>) ?? {};
  const rowAttrs = data.rows.map(row =>
    normalizeFreeTextAttributes(
      { ...sharedAttrs, ...(row.attributes as Record<string, string>) },
      batchSchema,
    ) as Record<string, string>,
  );

  const variantKeys = getVariantKeys(product);
  const existingVariants = await ProductVariant.findAll({ where: { productId } });
  if (variantKeys.length > 0) {
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

  // Adding a new option (e.g. a new size) to a group that already has other options
  // (e.g. other sizes of the same color) should update every existing option's images
  // to match, the same way editing one option's photos propagates to its siblings.
  const groupSiblings = findGroupSiblingsByAttrs(product, sharedAttrs, existingVariants);

  const openedGroups = newGroupLabels(
    batchSchema,
    rowAttrs,
    existingVariants.map(v => v.attributes as Record<string, unknown>),
  );
  await assertCanAdd(sellerId, product.category, openedGroups.length);

  const images = await commitImages((data.images ?? []).map(normalizeImageKey));
  let limitUsage: LimitUsage | null = null;
  const variants = await sequelize.transaction(async (t) => {
    const created = await Promise.all(
      rowAttrs.map((attrs, i) =>
        ProductVariant.create({
          productId,
          attributes:   attrs,
          images,
          stock:        data.rows[i].stock,
          sellingPrice: data.sellingPrice,
          mrp:          data.mrp ?? null,
          isActive:     data.isActive ?? true,
        }, { transaction: t }),
      ),
    );

    if (groupSiblings.length > 0) {
      await Promise.all(groupSiblings.map(s => s.update({ images }, { transaction: t })));
    }
    await addNewOptionsToGroupBoosts(product, created, existingVariants, t);
    limitUsage = await consumeGroupUnits(
      t,
      { sellerId, category: product.category, productId, productName: product.name },
      openedGroups,
    );

    return created;
  });
  notifyLimitThreshold(limitUsage);

  await syncProductStock(productId);
  await syncProductVariantAttrs(productId);

  for (const variant of variants) {
    await recordPurchase({
      sellerId,
      productId,
      variantId:   variant.id,
      quantity:    variant.stock,
      stockBefore: 0,
      stockAfter:  variant.stock,
      productName: product.name,
      variantInfo: variant.attributes as Record<string, unknown>,
      costPriceAtPurchase: product.costPrice,
    });
  }

  return variants;
}

export async function updateVariant(
  productId: string,
  variantId: string,
  sellerId: string,
  data: UpdateVariantInput,
  endBoost: boolean,
): Promise<{ variant: ProductVariant; siblings: ProductVariant[]; cancelledBoosts: number; endedBoosts: number }> {
  const product = await requireOwnProduct(sellerId, productId);
  const variant = await requireOwnVariant(productId, variantId);

  const hiding = data.isActive === false && variant.isActive;
  const hidesLastVisible = hiding && !(await hasOtherActiveVariant(productId, variantId));
  if (hidesLastVisible) await assertLastVisibleHideConfirmed(productId, endBoost);
  const endingBoostIds = hiding && !hidesLastVisible ? await resolveBoostsEndedByHide(productId, variantId, endBoost) : [];

  const stockBefore = variant.stock;
  const stockDelta = data.stock !== undefined ? data.stock - stockBefore : 0;

  // S3 side effects happen before the DB transaction opens (same sequencing as
  // productService.createProduct) — they can't be rolled back if the transaction fails.
  const committedImages = data.images !== undefined
    ? await commitImages(data.images.map(normalizeImageKey))
    : undefined;

  // Sibling options (e.g. other sizes of the same color) share one image set — editing
  // one option's photos should update every option in its group, not just itself.
  let siblings: ProductVariant[] = [];
  if (committedImages !== undefined) {
    const allVariants = await ProductVariant.findAll({ where: { productId } });
    siblings = findGroupSiblings(product, variant, allVariants);
  }

  const { cancelledBoosts, endedBoosts } = await sequelize.transaction(async (t) => {
    const productWide = hidesLastVisible ? await endProductBoosts(productId, t) : null;
    const ended = endingBoostIds.length > 0
      ? await completeLiveBoosts({ id: { [Op.in]: endingBoostIds } }, t)
      : productWide?.endedBoosts ?? 0;
    await variant.update({
      ...(committedImages   !== undefined && { images:       committedImages }),
      ...(data.stock        !== undefined && { stock:        data.stock }),
      ...(data.sellingPrice !== undefined && { sellingPrice: data.sellingPrice }),
      ...(data.mrp          !== undefined && { mrp:          data.mrp }),
      ...(data.isActive     !== undefined && { isActive:     data.isActive }),
    }, { transaction: t });

    const cancelled = productWide?.cancelledBoosts
      ?? (hiding ? await cancelPendingBoostsLeftHidden(productId, variantId, t) : 0);

    if (committedImages !== undefined && siblings.length > 0) {
      await Promise.all(siblings.map(s => s.update({ images: committedImages }, { transaction: t })));
    }
    return { cancelledBoosts: cancelled, endedBoosts: ended };
  });

  // Sequelize's instance.update() only RETURNINGs on INSERT, not UPDATE — without
  // reload(), DECIMAL fields stay as the raw JS number passed in instead of the
  // DB-cast string (e.g. 999 vs "999.00"), so the response wouldn't match a GET.
  await variant.reload();
  await Promise.all(siblings.map(s => s.reload()));

  await syncProductStock(productId);

  if (stockDelta !== 0) {
    await recordPurchase({
      sellerId,
      productId,
      variantId:   variant.id,
      quantity:    stockDelta,
      stockBefore,
      stockAfter:  variant.stock,
      productName: product.name,
      variantInfo: variant.attributes as Record<string, unknown>,
      costPriceAtPurchase: product.costPrice,
    });
  }

  return { variant, siblings, cancelledBoosts, endedBoosts };
}

export async function deleteVariant(
  productId: string,
  variantId: string,
  sellerId: string,
  endBoost: boolean,
): Promise<{ productDeleted: boolean; cancelledBoosts: number; endedBoosts: number }> {
  const product = await requireOwnProduct(sellerId, productId);
  const variant = await requireOwnVariant(productId, variantId);

  const totalCount = await ProductVariant.count({ where: { productId } });
  const isLastVariant = totalCount === 1;
  // Deleting down to only hidden variants hides the product, so it ends every boost on it.
  const endsAllBoosts = isLastVariant || (variant.isActive && !(await hasOtherActiveVariant(productId, variantId)));
  const endingBoostIds = endsAllBoosts ? [] : await findBoostsEndedBy(productId, variantId);
  const endsBoost = endsAllBoosts ? await hasLiveBoost(productId) : endingBoostIds.length > 0;
  // Older app builds don't send endBoost, so they get a 409 instead of silently ending a paid boost.
  if (endsBoost && !endBoost) {
    throw Object.assign(new Error(BOOST_ENDS_ON_DELETE_MESSAGE), { status: 409 });
  }

  const stockBefore = variant.stock;

  const { productDeleted, cancelledBoosts, endedBoosts } = await sequelize.transaction(async (t) => {
    // Recorded before destroy() — the FK needs the variant row to still exist,
    // and product_id/variant_id fall back to SET NULL on delete so the log survives.
    await recordPurchase({
      sellerId,
      productId,
      variantId,
      quantity:    -stockBefore,
      stockBefore,
      stockAfter:  0,
      productName: product.name,
      variantInfo: variant.attributes as Record<string, unknown>,
      costPriceAtPurchase: product.costPrice,
    }, t);

    // Before detaching, so a boost ended here isn't re-anchored as if it were still live.
    let ended = 0;
    if (endsBoost) {
      ended = await completeLiveBoosts(endsAllBoosts ? { productId } : { id: { [Op.in]: endingBoostIds } }, t);
    }
    const leftHiddenCancelled = endsAllBoosts && !isLastVariant ? await cancelPendingBoosts({ productId }, t) : 0;
    const detached = leftHiddenCancelled + await detachDeletedOptionFromBoosts(productId, variantId, t);

    await variant.destroy({ transaction: t });
    const remaining = await ProductVariant.count({ where: { productId }, transaction: t });
    if (remaining > 0) return { productDeleted: false, cancelledBoosts: detached, endedBoosts: ended };
    const productWide = await cancelPendingBoosts({ productId }, t);
    await product.destroy({ transaction: t });
    return { productDeleted: true, cancelledBoosts: detached + productWide, endedBoosts: ended };
  });
  if (!productDeleted) {
    await syncProductStock(productId);
    await syncProductVariantAttrs(productId);
  }
  return { productDeleted, cancelledBoosts, endedBoosts };
}

export async function toggleVariant(
  productId: string,
  variantId: string,
  sellerId: string,
  endBoost: boolean,
): Promise<{ variant: ProductVariant; cancelledBoosts: number; endedBoosts: number }> {
  await requireOwnProduct(sellerId, productId);
  const variant = await requireOwnVariant(productId, variantId);

  const hiding = variant.isActive;
  const hidesLastVisible = hiding && !(await hasOtherActiveVariant(productId, variantId));
  if (hidesLastVisible) await assertLastVisibleHideConfirmed(productId, endBoost);
  const endingBoostIds = hiding && !hidesLastVisible ? await resolveBoostsEndedByHide(productId, variantId, endBoost) : [];

  return sequelize.transaction(async (t) => {
    if (hidesLastVisible) {
      const productWide = await endProductBoosts(productId, t);
      await variant.update({ isActive: false }, { transaction: t });
      return { variant, ...productWide };
    }
    const endedBoosts = endingBoostIds.length > 0
      ? await completeLiveBoosts({ id: { [Op.in]: endingBoostIds } }, t)
      : 0;
    await variant.update({ isActive: !variant.isActive }, { transaction: t });
    const cancelledBoosts = hiding ? await cancelPendingBoostsLeftHidden(productId, variantId, t) : 0;
    return { variant, cancelledBoosts, endedBoosts };
  });
}

