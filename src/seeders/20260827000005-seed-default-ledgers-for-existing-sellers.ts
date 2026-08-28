import type { QueryInterface } from 'sequelize';
import { QueryTypes } from 'sequelize';
import { DEFAULT_LEDGER_NAMES } from '../services/seller/ledgerService';

async function up(queryInterface: QueryInterface): Promise<void> {
  const sellers = await queryInterface.sequelize.query<{ id: string }>(
    `SELECT id FROM users WHERE role = 'SELLER'`,
    { type: QueryTypes.SELECT },
  );
  if (sellers.length === 0) return;

  const existing = await queryInterface.sequelize.query<{ seller_id: string; name: string }>(
    `SELECT seller_id, name FROM seller_ledgers`,
    { type: QueryTypes.SELECT },
  );
  const existingKeys = new Set(existing.map((row) => `${row.seller_id}::${row.name}`));

  const now = new Date();
  const rows = sellers.flatMap((seller) =>
    DEFAULT_LEDGER_NAMES.filter((name) => !existingKeys.has(`${seller.id}::${name}`)).map((name) => ({
      seller_id: seller.id,
      name,
      created_at: now,
      updated_at: now,
    })),
  );

  if (rows.length === 0) return;
  await queryInterface.bulkInsert('seller_ledgers', rows);
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(
    `DELETE FROM seller_ledgers sl
     WHERE sl.name = ANY(ARRAY[:names]::varchar[])
       AND NOT EXISTS (SELECT 1 FROM expenses e WHERE e.ledger_id = sl.id)`,
    { replacements: { names: [...DEFAULT_LEDGER_NAMES] } },
  );
}

export { up, down };
