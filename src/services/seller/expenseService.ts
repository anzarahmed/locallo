import { Op } from 'sequelize';
import type { WhereOptions } from 'sequelize';
import { Expense } from '../../models/Expense';
import { SellerLedger } from '../../models/SellerLedger';

export interface CreateExpenseInput {
  ledgerId: string;
  amount: number;
  description?: string;
  expenseDate: string;
}

export async function createExpense(sellerId: string, data: CreateExpenseInput): Promise<Expense> {
  const ledger = await SellerLedger.findOne({ where: { id: data.ledgerId, sellerId } });
  if (!ledger) {
    throw Object.assign(new Error('Ledger not found'), { status: 404 });
  }

  const expense = await Expense.create({
    sellerId,
    ledgerId: data.ledgerId,
    amount: data.amount,
    description: data.description ?? null,
    expenseDate: data.expenseDate,
  });

  return (await Expense.findByPk(expense.id, {
    include: [{ model: SellerLedger, attributes: ['id', 'name'] }],
  }))!;
}

export interface ListExpensesOptions {
  from?: Date;
  to?: Date;
  ledgerId?: string;
}

export async function listExpenses(
  sellerId: string,
  page: number,
  limit: number,
  options: ListExpensesOptions = {},
): Promise<{ rows: Expense[]; count: number }> {
  const where: WhereOptions = { sellerId };
  if (options.ledgerId) where.ledgerId = options.ledgerId;
  if (options.from || options.to) {
    where.expenseDate = {
      ...(options.from && { [Op.gte]: options.from }),
      ...(options.to   && { [Op.lte]: options.to }),
    };
  }

  return Expense.findAndCountAll({
    where,
    include: [{ model: SellerLedger, attributes: ['id', 'name'] }],
    order: [['expenseDate', 'DESC']],
    limit,
    offset: (page - 1) * limit,
  });
}

export interface UpdateExpenseInput {
  ledgerId?: string;
  amount?: number;
  description?: string;
  expenseDate?: string;
}

export async function updateExpense(sellerId: string, expenseId: string, data: UpdateExpenseInput): Promise<Expense> {
  const expense = await Expense.findOne({ where: { id: expenseId, sellerId } });
  if (!expense) {
    throw Object.assign(new Error('Expense not found'), { status: 404 });
  }

  if (data.ledgerId !== undefined) {
    const ledger = await SellerLedger.findOne({ where: { id: data.ledgerId, sellerId } });
    if (!ledger) {
      throw Object.assign(new Error('Ledger not found'), { status: 404 });
    }
  }

  await expense.update({
    ...(data.ledgerId !== undefined && { ledgerId: data.ledgerId }),
    ...(data.amount !== undefined && { amount: data.amount }),
    ...(data.description !== undefined && { description: data.description || null }),
    ...(data.expenseDate !== undefined && { expenseDate: data.expenseDate }),
  });

  return (await Expense.findByPk(expense.id, {
    include: [{ model: SellerLedger, attributes: ['id', 'name'] }],
  }))!;
}

export async function deleteExpense(sellerId: string, expenseId: string): Promise<void> {
  const expense = await Expense.findOne({ where: { id: expenseId, sellerId } });
  if (!expense) {
    throw Object.assign(new Error('Expense not found'), { status: 404 });
  }
  await expense.destroy();
}
