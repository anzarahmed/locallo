import type { Request, Response } from 'express';
import { sendSuccess, handleServiceError } from '../../utils/response';
import { parsePagination } from '../../utils/pagination';
import * as expenseService from '../../services/seller/expenseService';

export async function addExpense(req: Request, res: Response): Promise<void> {
  try {
    const expense = await expenseService.createExpense(req.seller!.id, {
      ledgerId:    String(req.body.ledgerId),
      amount:      Number(req.body.amount),
      description: req.body.description ? String(req.body.description) : undefined,
      expenseDate: String(req.body.expenseDate),
    });
    sendSuccess(res, { expense }, 'Expense recorded', 201);
  } catch (err: unknown) {
    handleServiceError(err, res, 'Failed to record expense');
  }
}

export async function getExpenses(req: Request, res: Response): Promise<void> {
  const { page, limit } = parsePagination(req);
  const from     = typeof req.query.from === 'string' ? new Date(req.query.from) : undefined;
  const to       = typeof req.query.to   === 'string' ? new Date(req.query.to)   : undefined;
  const ledgerId = typeof req.query.ledgerId === 'string' ? req.query.ledgerId : undefined;

  const { rows, count } = await expenseService.listExpenses(req.seller!.id, page, limit, { from, to, ledgerId });
  sendSuccess(res, { expenses: rows, total: count, page, limit }, 'Expenses fetched');
}

export async function editExpense(req: Request, res: Response): Promise<void> {
  try {
    const expense = await expenseService.updateExpense(req.seller!.id, String(req.params.id), {
      ledgerId:    req.body.ledgerId !== undefined ? String(req.body.ledgerId) : undefined,
      amount:      req.body.amount !== undefined ? Number(req.body.amount) : undefined,
      description: req.body.description !== undefined ? String(req.body.description) : undefined,
      expenseDate: req.body.expenseDate !== undefined ? String(req.body.expenseDate) : undefined,
    });
    sendSuccess(res, { expense }, 'Expense updated');
  } catch (err: unknown) {
    handleServiceError(err, res, 'Failed to update expense');
  }
}

export async function removeExpense(req: Request, res: Response): Promise<void> {
  try {
    await expenseService.deleteExpense(req.seller!.id, String(req.params.id));
    sendSuccess(res, null, 'Expense deleted');
  } catch (err: unknown) {
    handleServiceError(err, res, 'Failed to delete expense');
  }
}
