import type { QueryInterface } from 'sequelize';

async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(
      `ALTER TABLE product_boosts DROP CONSTRAINT product_boosts_payment_status_check`,
      { transaction: t },
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE product_boosts ADD CONSTRAINT product_boosts_payment_status_check CHECK (payment_status IN ('pending', 'paid', 'failed', 'cancelled'))`,
      { transaction: t },
    );
  });
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(
      `UPDATE product_boosts SET payment_status = 'failed' WHERE payment_status = 'cancelled'`,
      { transaction: t },
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE product_boosts DROP CONSTRAINT product_boosts_payment_status_check`,
      { transaction: t },
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE product_boosts ADD CONSTRAINT product_boosts_payment_status_check CHECK (payment_status IN ('pending', 'paid', 'failed'))`,
      { transaction: t },
    );
  });
}

export { up, down };
