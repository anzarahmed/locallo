import type { QueryInterface } from 'sequelize';

async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(
    `ALTER TABLE wishlists ADD COLUMN in_stock BOOLEAN, ADD COLUMN restock_notified_at TIMESTAMPTZ`,
  );
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(
    `ALTER TABLE wishlists DROP COLUMN in_stock, DROP COLUMN restock_notified_at`,
  );
}

export { up, down };
