import { apiGet, apiPost, apiPut, apiDelete } from '../lib/axios';
import { PATHS } from '../api/paths';
import type { Ledger, Expense, ExpensesResponse, PnlSummary, PnlPeriod } from '../types';

export function getLedgers(): Promise<{ ledgers: Ledger[] }> {
  return apiGet(PATHS.LEDGERS);
}

export function createLedger(name: string): Promise<{ ledger: Ledger }> {
  return apiPost(PATHS.LEDGERS, { name });
}

export function updateLedger(id: string, name: string): Promise<{ ledger: Ledger }> {
  return apiPut(PATHS.LEDGER_BY_ID(id), { name });
}

export function deleteLedger(id: string): Promise<unknown> {
  return apiDelete(PATHS.LEDGER_BY_ID(id));
}

export interface CreateExpensePayload {
  ledgerId: string;
  amount: number;
  description?: string;
  expenseDate: string;
}

function normalizeExpense(expense: Expense): Expense {
  return { ...expense, amount: Number(expense.amount) };
}

export async function createExpense(data: CreateExpensePayload): Promise<{ expense: Expense }> {
  const { expense } = await apiPost<{ expense: Expense }>(PATHS.EXPENSES, data);
  return { expense: normalizeExpense(expense) };
}

export async function getExpenses(params?: {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
  ledgerId?: string;
}): Promise<ExpensesResponse> {
  const data = await apiGet<ExpensesResponse>(PATHS.EXPENSES, params);
  return { ...data, expenses: data.expenses.map(normalizeExpense) };
}

export interface UpdateExpensePayload {
  ledgerId?: string;
  amount?: number;
  description?: string;
  expenseDate?: string;
}

export async function updateExpense(id: string, data: UpdateExpensePayload): Promise<{ expense: Expense }> {
  const { expense } = await apiPut<{ expense: Expense }>(PATHS.EXPENSE_BY_ID(id), data);
  return { expense: normalizeExpense(expense) };
}

export function deleteExpense(id: string): Promise<unknown> {
  return apiDelete(PATHS.EXPENSE_BY_ID(id));
}

export function getPnlSummary(params: {
  period: PnlPeriod;
  fy?: number;
  from?: string;
  to?: string;
}): Promise<PnlSummary> {
  return apiGet(PATHS.PNL_SUMMARY, params);
}
