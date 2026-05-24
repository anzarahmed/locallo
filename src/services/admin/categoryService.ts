import { Op } from 'sequelize';
import type { InferType } from 'yup';
import { Category } from '../../models/Category';
import { SellerProfile } from '../../models/SellerProfile';
import type { createCategorySchema, updateCategorySchema } from '../../validation/admin/categorySchemas';

type CreateCategoryInput = InferType<typeof createCategorySchema>;
type UpdateCategoryInput = InferType<typeof updateCategorySchema>;

const VALID_CATEGORY_SORT = new Set(['name', 'slug', 'createdAt']);

interface ListCategoriesFilter {
  search?: string;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export async function listCategories(
  filters: ListCategoriesFilter = {},
  page = 1,
  limit = 1000,
): Promise<{ rows: Category[]; count: number }> {
  const where: Record<string, unknown> = {};
  if (filters.isActive !== undefined) where.isActive = filters.isActive;
  if (filters.search) where.name = { [Op.iLike]: `%${filters.search}%` };

  const sortField = VALID_CATEGORY_SORT.has(filters.sortBy ?? '') ? (filters.sortBy as string) : 'name';
  const sortOrder = filters.sortOrder ?? 'ASC';

  return Category.findAndCountAll({
    where,
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
  return Category.create({ name: data.name, slug: data.slug });
}

export async function updateCategory(id: number, data: UpdateCategoryInput): Promise<Category> {
  const category = await Category.findByPk(id);
  if (!category) {
    throw Object.assign(new Error('Category not found'), { status: 404 });
  }
  await category.update(data);
  return category;
}

export async function deleteCategory(id: number): Promise<void> {
  const category = await Category.findByPk(id);
  if (!category) {
    throw Object.assign(new Error('Category not found'), { status: 404 });
  }
  const usageCount = await SellerProfile.count({ where: { categoryId: id } });
  if (usageCount > 0) {
    throw Object.assign(
      new Error(`Cannot delete — ${usageCount} seller${usageCount === 1 ? ' is' : 's are'} using this category`),
      { status: 409 },
    );
  }
  await category.destroy();
}
