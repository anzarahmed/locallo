import { QueryTypes } from 'sequelize';
import sequelize from '../../config/database';

export interface PnlSummary {
  totalSales: number;
  totalCost: number;
  totalExpenses: number;
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

interface StockValueRow {
  stockValue: string | null;
}

interface SoldAdjacentRow {
  soldCost: string | null;
}

// Stock isn't snapshotted historically, so stock-as-of-a-date is reconstructed from
// (date-eligible) current stock value plus/minus the cost of units sold around that
// date — restricted to products that already existed at that date, so a product
// created afterwards can't contribute. This still can't account for a manual stock
// increase on a pre-existing product after the date (e.g. a restock edit) — there's
// no audit log for that — only for brand-new products and recorded sales, which
// cover the common cases.
//
// Closing stock (as of `to`): current stock for products created on/before `to`,
// plus the cost of everything sold *after* `to` (those units were still on hand at
// `to`, but a later sale has since removed them from current stock).
//
// Opening stock (as of `from`): current stock for products created *before* `from`,
// plus the cost of everything sold on/after `from` (those units were on hand at the
// start of the period, but a sale during/after the period has since removed them
// from current stock).
async function stockValueAsOf(
  sellerId: string,
  asOf: Date,
  direction: 'opening' | 'closing',
): Promise<number> {
  const createdOp = direction === 'closing' ? '<=' : '<';
  const soldOp = direction === 'closing' ? '>' : '>=';

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
     WHERE sl.seller_id = :sellerId AND sl.sold_at ${soldOp} :asOf AND p.created_at ${createdOp} :asOf`,
    { type: QueryTypes.SELECT, replacements: { sellerId, asOf } },
  );

  return Number(stockRow?.stockValue ?? 0) + Number(soldRow?.soldCost ?? 0);
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

  const openingStockValue = await stockValueAsOf(sellerId, from, 'opening');
  const closingStockValue = await stockValueAsOf(sellerId, to, 'closing');

  const totalSales    = Number(salesCost?.totalSales ?? 0);
  const totalCost     = Number(salesCost?.totalCost ?? 0);
  const totalExpenses = Number(expenses?.totalExpenses ?? 0);
  const grossProfit   = totalSales - totalCost;
  const netProfitLoss = grossProfit - totalExpenses;

  return {
    totalSales,
    totalCost,
    totalExpenses,
    openingStockValue,
    closingStockValue,
    grossProfit,
    netProfitLoss,
    from,
    to,
  };
}
