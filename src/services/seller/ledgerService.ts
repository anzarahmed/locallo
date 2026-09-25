import type { Transaction, WhereOptions } from 'sequelize';
import { Op, fn, col, where as sequelizeWhere } from 'sequelize';
import { SellerLedger } from '../../models/SellerLedger';

// Ledger names must be unique per seller regardless of case ("Rent" vs "rent") — the DB has
// a matching case-insensitive unique index on (seller_id, lower(name)).
function byNameCaseInsensitive(sellerId: string, name: string): WhereOptions {
  return {
    sellerId,
    [Op.and]: sequelizeWhere(fn('lower', col('name')), name.toLowerCase()),
  };
}

export const DEFAULT_LEDGER_NAMES = [
  'Salary & Wages',
  'Rent',
  'Electricity',
  'Carriage',
  'Petrol & Convenience',
  'Advertising',
  'Repairing & Maintenance',
  'Mobile & Internet Expenses',
  'Other Expenses',
] as const;

export async function createDefaultLedgers(sellerId: string, transaction?: Transaction): Promise<void> {
  const existing = await SellerLedger.findAll({
    where: { sellerId },
    attributes: ['name'],
    transaction,
  });
  const existingNames = new Set(existing.map((l) => l.name));
  const missing = DEFAULT_LEDGER_NAMES.filter((name) => !existingNames.has(name));
  if (missing.length === 0) return;

  await SellerLedger.bulkCreate(
    missing.map((name) => ({ sellerId, name, isDefault: true })),
    { transaction },
  );
}

export async function createLedger(sellerId: string, name: string): Promise<SellerLedger> {
  const existing = await SellerLedger.findOne({ where: byNameCaseInsensitive(sellerId, name) });
  if (existing) {
    throw Object.assign(new Error(`A ledger named "${existing.name}" already exists`), { status: 409 });
  }
  return SellerLedger.create({ sellerId, name });
}

// Default ledgers are bulk-inserted with identical createdAt, so createdAt alone gives
// Postgres an arbitrary (and unstable) order — rank defaults by DEFAULT_LEDGER_NAMES instead.
function defaultRank(ledger: SellerLedger): number {
  const idx = (DEFAULT_LEDGER_NAMES as readonly string[]).indexOf(ledger.name);
  return ledger.isDefault && idx !== -1 ? idx : DEFAULT_LEDGER_NAMES.length;
}

export async function listLedgers(sellerId: string): Promise<SellerLedger[]> {
  const ledgers = await SellerLedger.findAll({
    where: { sellerId },
    order: [['createdAt', 'ASC'], ['id', 'ASC']],
  });
  return ledgers.sort((a, b) => defaultRank(a) - defaultRank(b));
}

export async function updateLedger(sellerId: string, ledgerId: string, name: string): Promise<SellerLedger> {
  const ledger = await SellerLedger.findOne({ where: { id: ledgerId, sellerId } });
  if (!ledger) {
    throw Object.assign(new Error('Ledger not found'), { status: 404 });
  }
  if (ledger.isDefault) {
    throw Object.assign(new Error('Default ledgers cannot be renamed'), { status: 403 });
  }

  const conflict = await SellerLedger.findOne({ where: byNameCaseInsensitive(sellerId, name) });
  if (conflict && conflict.id !== ledgerId) {
    throw Object.assign(new Error(`A ledger named "${conflict.name}" already exists`), { status: 409 });
  }

  await ledger.update({ name });
  return ledger;
}

export async function deleteLedger(sellerId: string, ledgerId: string): Promise<void> {
  const ledger = await SellerLedger.findOne({ where: { id: ledgerId, sellerId } });
  if (!ledger) {
    throw Object.assign(new Error('Ledger not found'), { status: 404 });
  }
  if (ledger.isDefault) {
    throw Object.assign(new Error('Default ledgers cannot be deleted'), { status: 403 });
  }
  await ledger.destroy();
}
