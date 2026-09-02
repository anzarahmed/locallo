import type { QueryInterface } from 'sequelize';

async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(
      `ALTER TABLE product_boosts DROP CONSTRAINT product_boosts_status_check`,
      { transaction: t },
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE product_boosts ADD CONSTRAINT product_boosts_status_check CHECK (status IN ('pending', 'active', 'completed', 'cancelled'))`,
      { transaction: t },
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE product_boosts ALTER COLUMN status SET DEFAULT 'pending'`,
      { transaction: t },
    );
  });
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(
      `UPDATE product_boosts SET status = 'cancelled' WHERE status = 'pending'`,
      { transaction: t },
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE product_boosts ALTER COLUMN status SET DEFAULT 'active'`,
      { transaction: t },
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE product_boosts DROP CONSTRAINT product_boosts_status_check`,
      { transaction: t },
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE product_boosts ADD CONSTRAINT product_boosts_status_check CHECK (status IN ('active', 'completed', 'cancelled'))`,
      { transaction: t },
    );
  });
}

export { up, down };
