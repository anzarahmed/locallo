import { Op, ForeignKeyConstraintError } from 'sequelize';
import type { InferType } from 'yup';
import { Category } from '../../models/Category';
import { MasterCategory } from '../../models/MasterCategory';
import { SellerProfile } from '../../models/SellerProfile';
import { normalizeImageKey, commitCategoryIcon, deleteImage } from '../../utils/imageStorage';
import { assertMasterCategoryExists } from './masterCategoryService';
import type { createCategorySchema, updateCategorySchema } from '../../validation/admin/categorySchemas';

type CreateCategoryInput = InferType<typeof createCategorySchema>;
type UpdateCategoryInput = InferType<typeof updateCategorySchema>;

const VALID_CATEGORY_SORT = new Set(['name', 'slug', 'isActive', 'createdAt']);

interface ListCategoriesFilter {
  search?: string;
  isActive?: boolean;
  unassigned?: boolean;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

function wrapForeignKeyError(err: unknown): never {
  if (err instanceof ForeignKeyConstraintError) {
    throw Object.assign(new Error('Master Category not found'), { status: 404 });
  }
  throw err;
}

export async function listCategories(
  filters: ListCategoriesFilter = {},
  page = 1,
  limit = 1000,
): Promise<{ rows: Category[]; count: number }> {
  const where: Record<string, unknown> = {};
  if (filters.isActive !== undefined) where.isActive = filters.isActive;
  if (filters.search) where.name = { [Op.iLike]: `%${filters.search}%` };
  if (filters.unassigned) where.masterCategoryId = null;

  const sortField = VALID_CATEGORY_SORT.has(filters.sortBy ?? '') ? (filters.sortBy as string) : 'name';
  const sortOrder = filters.sortOrder ?? 'ASC';

  return Category.findAndCountAll({
    where,
    include: [{ model: MasterCategory, attributes: ['id', 'name', 'slug'] }],
    order: [[sortField, sortOrder]],
    limit,
    offset: (page - 1) * limit,
  });
}

export async function createCategory(data: CreateCategoryInput): Promise<Category> {
  const existing = await Category.findOne({ where: { name: data.name } });
  if (existing) {
    throw Object.assign(new Error('Category name already exists'), { status: 409 });
  }
  const slugExists = await Category.findOne({ where: { slug: data.slug } });
  if (slugExists) {
    throw Object.assign(new Error('Category slug already exists'), { status: 409 });
  }
  await assertMasterCategoryExists(data.masterCategoryId);
  const icon = data.icon ? await commitCategoryIcon(normalizeImageKey(data.icon)) : null;
  try {
    return await Category.create({
      name: data.name,
      slug: data.slug,
      masterCategoryId: data.masterCategoryId,
      attributeSchema: data.attributeSchema ?? [],
      icon,
    });
  } catch (err: unknown) {
    return wrapForeignKeyError(err);
  }
}

export async function updateCategory(id: number, data: UpdateCategoryInput): Promise<Category> {
  const category = await Category.findByPk(id);
  if (!category) {
    throw Object.assign(new Error('Category not found'), { status: 404 });
  }

  if (data.masterCategoryId !== undefined) {
    await assertMasterCategoryExists(data.masterCategoryId);
  }

  const updates: Partial<UpdateCategoryInput> = { ...data };
  if (data.icon !== undefined) {
    const previousIcon = category.icon;
    const newIcon = data.icon ? await commitCategoryIcon(normalizeImageKey(data.icon)) : null;
    updates.icon = newIcon;
    if (previousIcon && previousIcon !== newIcon) {
      await deleteImage(previousIcon).catch(() => {});
    }
  }

  try {
    await category.update(updates);
  } catch (err: unknown) {
    wrapForeignKeyError(err);
  }
  return category;
}

export async function deleteCategory(id: number): Promise<void> {
  const category = await Category.findByPk(id);
  if (!category) {
    throw Object.assign(new Error('Category not found'), { status: 404 });
  }
  const usageCount = await SellerProfile.count({ where: { categoryIds: { [Op.contains]: [id] } } });
  if (usageCount > 0) {
    throw Object.assign(
      new Error(`Cannot delete — ${usageCount} seller${usageCount === 1 ? ' is' : 's are'} using this category`),
      { status: 409 },
    );
  }
  await category.destroy();
}
