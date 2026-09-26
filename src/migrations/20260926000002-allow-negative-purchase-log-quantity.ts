import type { QueryInterface } from 'sequelize';

// purchase_logs now records the full stock movement (positive = added, negative =
// removed via a stock decrease or product/variant deletion), not just additions.
async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(
    `ALTER TABLE purchase_logs DROP CONSTRAINT purchase_logs_quantity_check`,
  );
  await queryInterface.sequelize.query(
    `ALTER TABLE purchase_logs ADD CONSTRAINT purchase_logs_quantity_check CHECK (quantity <> 0)`,
  );
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(
    `ALTER TABLE purchase_logs DROP CONSTRAINT purchase_logs_quantity_check`,
  );
  await queryInterface.sequelize.query(
    `ALTER TABLE purchase_logs ADD CONSTRAINT purchase_logs_quantity_check CHECK (quantity > 0)`,
  );
}

export { up, down };
