import type { QueryInterface } from 'sequelize';
import { DEFAULT_LEDGER_NAMES } from '../services/seller/ledgerService';

async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(
    `ALTER TABLE seller_ledgers ADD COLUMN is_default BOOLEAN NOT NULL DEFAULT false`,
  );
  await queryInterface.sequelize.query(
    `UPDATE seller_ledgers SET is_default = true WHERE name = ANY(ARRAY[:names]::varchar[])`,
    { replacements: { names: [...DEFAULT_LEDGER_NAMES] } },
  );
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(`ALTER TABLE seller_ledgers DROP COLUMN is_default`);
}

export { up, down };
