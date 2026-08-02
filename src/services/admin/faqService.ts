import { Op } from 'sequelize';
import type { InferType } from 'yup';
import { Faq } from '../../models/Faq';
import type { createFaqSchema, updateFaqSchema } from '../../validation/admin/faqSchemas';

type CreateFaqInput = InferType<typeof createFaqSchema>;
type UpdateFaqInput = InferType<typeof updateFaqSchema>;

const VALID_FAQ_SORT = new Set(['question', 'isActive', 'createdAt']);

interface ListFaqsFilter {
  search?: string;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export async function listFaqs(
  filters: ListFaqsFilter = {},
  page = 1,
  limit = 1000,
): Promise<{ rows: Faq[]; count: number }> {
  const where: Record<string, unknown> = {};
  if (filters.isActive !== undefined) where.isActive = filters.isActive;
  if (filters.search) where.question = { [Op.iLike]: `%${filters.search}%` };

  const sortField = VALID_FAQ_SORT.has(filters.sortBy ?? '') ? (filters.sortBy as string) : 'createdAt';
  const sortOrder = filters.sortOrder ?? 'ASC';

  return Faq.findAndCountAll({
    where,
    order: [[sortField, sortOrder]],
    limit,
    offset: (page - 1) * limit,
  });
}

export async function createFaq(data: CreateFaqInput): Promise<Faq> {
  return Faq.create({ question: data.question, answer: data.answer });
}

export async function updateFaq(id: number, data: UpdateFaqInput): Promise<Faq> {
  const faq = await Faq.findByPk(id);
  if (!faq) {
    throw Object.assign(new Error('FAQ not found'), { status: 404 });
  }
  await faq.update(data);
  return faq;
}

export async function deleteFaq(id: number): Promise<void> {
  const faq = await Faq.findByPk(id);
  if (!faq) {
    throw Object.assign(new Error('FAQ not found'), { status: 404 });
  }
  await faq.destroy();
}
