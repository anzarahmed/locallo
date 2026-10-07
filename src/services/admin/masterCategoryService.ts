import { Op, ForeignKeyConstraintError } from 'sequelize';
import type { InferType } from 'yup';
import { MasterCategory } from '../../models/MasterCategory';
import { Category } from '../../models/Category';
import { normalizeImageKey, commitMasterCategoryIcon, deleteImage } from '../../utils/imageStorage';
import type { createMasterCategorySchema, updateMasterCategorySchema } from '../../validation/admin/masterCategorySchemas';

type CreateMasterCategoryInput = InferType<typeof createMasterCategorySchema>;
type UpdateMasterCategoryInput = InferType<typeof updateMasterCategorySchema>;

const VALID_MASTER_CATEGORY_SORT = new Set(['name', 'slug', 'isActive', 'createdAt']);

interface ListMasterCategoriesFilter {
  search?: string;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export async function assertMasterCategoryExists(id: number): Promise<void> {
  const masterCategory = await MasterCategory.findByPk(id);
  if (!masterCategory) {
    throw Object.assign(new Error('Master Category not found'), { status: 404 });
  }
}

export async function listMasterCategories(
  filters: ListMasterCategoriesFilter = {},
  page = 1,
  limit = 1000,
): Promise<{ rows: MasterCategory[]; count: number }> {
  const where: Record<string, unknown> = {};
  if (filters.isActive !== undefined) where.isActive = filters.isActive;
  if (filters.search) where.name = { [Op.iLike]: `%${filters.search}%` };

  const sortField = VALID_MASTER_CATEGORY_SORT.has(filters.sortBy ?? '') ? (filters.sortBy as string) : 'name';
  const sortOrder = filters.sortOrder ?? 'ASC';

  return MasterCategory.findAndCountAll({
    where,
    order: [[sortField, sortOrder]],
    limit,
    offset: (page - 1) * limit,
  });
}

export async function getCategoryCounts(masterCategoryIds: number[]): Promise<Map<number, number>> {
  const counts = new Map<number, number>();
  await Promise.all(
    masterCategoryIds.map(async (id) => {
      counts.set(id, await Category.count({ where: { masterCategoryId: id } }));
    }),
  );
  return counts;
}

export async function createMasterCategory(data: CreateMasterCategoryInput): Promise<MasterCategory> {
  const existing = await MasterCategory.findOne({ where: { name: data.name } });
  if (existing) {
    throw Object.assign(new Error('Master Category name already exists'), { status: 409 });
  }
  const slugExists = await MasterCategory.findOne({ where: { slug: data.slug } });
  if (slugExists) {
    throw Object.assign(new Error('Master Category slug already exists'), { status: 409 });
  }
  const icon = data.icon ? await commitMasterCategoryIcon(normalizeImageKey(data.icon)) : null;
  return MasterCategory.create({ name: data.name, slug: data.slug, icon });
}

export async function updateMasterCategory(id: number, data: UpdateMasterCategoryInput): Promise<MasterCategory> {
  const masterCategory = await MasterCategory.findByPk(id);
  if (!masterCategory) {
    throw Object.assign(new Error('Master Category not found'), { status: 404 });
  }

  const updates: Partial<UpdateMasterCategoryInput> = { ...data };
  if (data.icon !== undefined) {
    const previousIcon = masterCategory.icon;
    const newIcon = data.icon ? await commitMasterCategoryIcon(normalizeImageKey(data.icon)) : null;
    updates.icon = newIcon;
    if (previousIcon && previousIcon !== newIcon) {
      await deleteImage(previousIcon).catch(() => {});
    }
  }

  await masterCategory.update(updates);
  return masterCategory;
}

export async function deleteMasterCategory(id: number): Promise<void> {
  const masterCategory = await MasterCategory.findByPk(id);
  if (!masterCategory) {
    throw Object.assign(new Error('Master Category not found'), { status: 404 });
  }
  const usageCount = await Category.count({ where: { masterCategoryId: id } });
  if (usageCount > 0) {
    throw Object.assign(
      new Error(`Cannot delete — ${usageCount} categor${usageCount === 1 ? 'y is' : 'ies are'} assigned to this master category`),
      { status: 409 },
    );
  }
  try {
    await masterCategory.destroy();
  } catch (err: unknown) {
    if (err instanceof ForeignKeyConstraintError) {
      throw Object.assign(
        new Error('Cannot delete — categories still reference this master category'),
        { status: 409 },
      );
    }
    throw err;
  }
}
