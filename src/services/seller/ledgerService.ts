import type { Transaction } from 'sequelize';
import { SellerLedger } from '../../models/SellerLedger';

export const DEFAULT_LEDGER_NAMES = [
  'Salary & Wages',
  'Rent',
  'Electricity',
  'Carriage',
  'Petrol & Convenience',
  'Advertising',
  'Repairing & Maintenance',
  'Mobile & Internet Expenses',
  'Purchase',
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
    missing.map((name) => ({ sellerId, name })),
    { transaction },
  );
}

export async function createLedger(sellerId: string, name: string): Promise<SellerLedger> {
  const existing = await SellerLedger.findOne({ where: { sellerId, name } });
  if (existing) {
    throw Object.assign(new Error('A ledger with this name already exists'), { status: 409 });
  }
  return SellerLedger.create({ sellerId, name });
}

export async function listLedgers(sellerId: string): Promise<SellerLedger[]> {
  return SellerLedger.findAll({ where: { sellerId }, order: [['createdAt', 'ASC']] });
}

export async function updateLedger(sellerId: string, ledgerId: string, name: string): Promise<SellerLedger> {
  const ledger = await SellerLedger.findOne({ where: { id: ledgerId, sellerId } });
  if (!ledger) {
    throw Object.assign(new Error('Ledger not found'), { status: 404 });
  }

  const conflict = await SellerLedger.findOne({ where: { sellerId, name } });
  if (conflict && conflict.id !== ledgerId) {
    throw Object.assign(new Error('A ledger with this name already exists'), { status: 409 });
  }

  await ledger.update({ name });
  return ledger;
}

export async function deleteLedger(sellerId: string, ledgerId: string): Promise<void> {
  const ledger = await SellerLedger.findOne({ where: { id: ledgerId, sellerId } });
  if (!ledger) {
    throw Object.assign(new Error('Ledger not found'), { status: 404 });
  }
  await ledger.destroy();
}
