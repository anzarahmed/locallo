import type { QueryInterface } from 'sequelize';

async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(
    `ALTER TABLE sold_logs
       ADD COLUMN selling_price_at_sale DECIMAL(12, 2),
       ADD COLUMN cost_price_at_sale    DECIMAL(12, 2)`,
  );
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(
    `ALTER TABLE sold_logs
       DROP COLUMN IF EXISTS selling_price_at_sale,
       DROP COLUMN IF EXISTS cost_price_at_sale`,
  );
}

export { up, down };
