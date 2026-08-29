import { QueryTypes } from 'sequelize';
import sequelize from '../../config/database';

export interface PnlExpenseItem {
  ledgerName: string;
  amount: number;
}

export interface PnlSummary {
  totalSales: number;
  totalCost: number;
  totalExpenses: number;
  totalPurchases: number;
  expenses: PnlExpenseItem[];
  openingStockValue: number;
  closingStockValue: number;
  grossProfit: number;
  netProfitLoss: number;
  from: Date;
  to: Date;
}

interface SalesCostRow {
  totalSales: string | null;
  totalCost: string | null;
}

interface ExpensesRow {
  totalExpenses: string | null;
}

interface ExpenseByLedgerRow {
  ledgerName: string;
  amount: string;
}

interface StockValueRow {
  stockValue: string | null;
}

interface SoldAdjacentRow {
  soldCost: string | null;
}

interface PurchasedAdjacentRow {
  purchasedCost: string | null;
}

interface PurchasesRow {
  totalPurchases: string | null;
}

// Stock isn't snapshotted historically, so stock-as-of-a-date is reconstructed from
// (date-eligible) current stock value, adjusted for everything that's moved stock
// since that date — restricted to products that already existed at that date, so a
// product created afterwards can't contribute.
//
// Closing stock (as of `to`): current stock for products created on/before `to`,
// plus the cost of everything sold *after* `to` (those units were still on hand at
// `to`, but a later sale has since removed them from current stock), minus the cost
// of everything purchased *after* `to` (those units are in current stock now, but
// weren't on hand yet at `to`).
//
// Opening stock (as of `from`): current stock for products created *before* `from`,
// plus the cost of everything sold on/after `from` (those units were on hand at the
// start of the period, but a sale during/after the period has since removed them
// from current stock), minus the cost of everything purchased on/after `from` (those
// units are in current stock now, but weren't on hand yet at the start of the period).
async function stockValueAsOf(
  sellerId: string,
  asOf: Date,
  direction: 'opening' | 'closing',
): Promise<number> {
  const createdOp = direction === 'closing' ? '<=' : '<';
  const adjacentOp = direction === 'closing' ? '>' : '>=';

  const [stockRow] = await sequelize.query<StockValueRow>(
    `SELECT COALESCE(SUM(cost_price * stock), 0) AS "stockValue"
     FROM products
     WHERE seller_id = :sellerId AND created_at ${createdOp} :asOf`,
    { type: QueryTypes.SELECT, replacements: { sellerId, asOf } },
  );

  const [soldRow] = await sequelize.query<SoldAdjacentRow>(
    `SELECT COALESCE(SUM(sl.cost_price_at_sale * sl.quantity), 0) AS "soldCost"
     FROM sold_logs sl
     JOIN products p ON p.id = sl.product_id
     WHERE sl.seller_id = :sellerId AND sl.sold_at ${adjacentOp} :asOf AND p.created_at ${createdOp} :asOf`,
    { type: QueryTypes.SELECT, replacements: { sellerId, asOf } },
  );

  const [purchasedRow] = await sequelize.query<PurchasedAdjacentRow>(
    `SELECT COALESCE(SUM(pl.cost_price_at_purchase * pl.quantity), 0) AS "purchasedCost"
     FROM purchase_logs pl
     JOIN products p ON p.id = pl.product_id
     WHERE pl.seller_id = :sellerId AND pl.purchased_at ${adjacentOp} :asOf AND p.created_at ${createdOp} :asOf`,
    { type: QueryTypes.SELECT, replacements: { sellerId, asOf } },
  );

  return Number(stockRow?.stockValue ?? 0)
    + Number(soldRow?.soldCost ?? 0)
    - Number(purchasedRow?.purchasedCost ?? 0);
}

export async function getPnlSummary(sellerId: string, from: Date, to: Date): Promise<PnlSummary> {
  const [salesCost] = await sequelize.query<SalesCostRow>(
    `SELECT
       COALESCE(SUM(selling_price_at_sale * quantity), 0) AS "totalSales",
       COALESCE(SUM(cost_price_at_sale * quantity), 0)    AS "totalCost"
     FROM sold_logs
     WHERE seller_id = :sellerId AND sold_at BETWEEN :from AND :to`,
    { type: QueryTypes.SELECT, replacements: { sellerId, from, to } },
  );

  const [expenses] = await sequelize.query<ExpensesRow>(
    `SELECT COALESCE(SUM(amount), 0) AS "totalExpenses"
     FROM expenses
     WHERE seller_id = :sellerId AND expense_date BETWEEN :from AND :to`,
    { type: QueryTypes.SELECT, replacements: { sellerId, from, to } },
  );

  const expensesByLedger = await sequelize.query<ExpenseByLedgerRow>(
    `SELECT sl.name AS "ledgerName", COALESCE(SUM(e.amount), 0) AS "amount"
     FROM expenses e
     JOIN seller_ledgers sl ON sl.id = e.ledger_id
     WHERE e.seller_id = :sellerId AND e.expense_date BETWEEN :from AND :to
     GROUP BY sl.id, sl.name
     ORDER BY sl.name ASC`,
    { type: QueryTypes.SELECT, replacements: { sellerId, from, to } },
  );

  const openingStockValue = await stockValueAsOf(sellerId, from, 'opening');
  const closingStockValue = await stockValueAsOf(sellerId, to, 'closing');

  // Real stock-addition purchases, from purchase_logs (one row per restock,
  // dated when the stock was actually added). Drives the "To Purchase" line
  // and the classic trading-account identity below, and also feeds the
  // purchased-after-asOf correction inside stockValueAsOf(). Note: no backfill
  // was done, so any restock that happened before this table existed (i.e.
  // before rollout) has no row — for a period whose opening/closing date
  // falls before such a restock, that restock won't be subtracted back out
  // of current stock, temporarily overstating opening/closing stock (and
  // therefore grossProfit). This self-corrects as pre-rollout restocks age
  // out of the date ranges being queried.
  const [purchasesRow] = await sequelize.query<PurchasesRow>(
    `SELECT COALESCE(SUM(cost_price_at_purchase * quantity), 0) AS "totalPurchases"
     FROM purchase_logs
     WHERE seller_id = :sellerId AND purchased_at BETWEEN :from AND :to`,
    { type: QueryTypes.SELECT, replacements: { sellerId, from, to } },
  );

  const totalSales     = Number(salesCost?.totalSales ?? 0);
  const totalCost      = Number(salesCost?.totalCost ?? 0);
  const totalExpenses  = Number(expenses?.totalExpenses ?? 0);
  const totalPurchases = Number(purchasesRow?.totalPurchases ?? 0);
  const grossProfit    = (totalSales + closingStockValue) - (openingStockValue + totalPurchases);
  const netProfitLoss  = grossProfit - totalExpenses;

  return {
    totalSales,
    totalCost,
    totalExpenses,
    totalPurchases,
    expenses: expensesByLedger.map((row) => ({ ledgerName: row.ledgerName, amount: Number(row.amount) })),
    openingStockValue,
    closingStockValue,
    grossProfit,
    netProfitLoss,
    from,
    to,
  };
}
