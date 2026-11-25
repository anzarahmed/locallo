import type { Request, Response } from 'express';
import { sendSuccess, handleServiceError } from '../../utils/response';
import { parsePagination } from '../../utils/pagination';
import { getIstDateString } from '../../utils/istDate';
import * as expenseService from '../../services/seller/expenseService';

// expense_date is a DATE column, so filters must be IST calendar dates (YYYY-MM-DD),
// never Date instants — formatting an instant can shift the day by the server's timezone.
function toIstDateOnly(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : getIstDateString(parsed);
}

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
  const from     = toIstDateOnly(typeof req.query.from === 'string' ? req.query.from : undefined);
  const to       = toIstDateOnly(typeof req.query.to   === 'string' ? req.query.to   : undefined);
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
