import type { QueryInterface } from 'sequelize';

async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(
      `ALTER TABLE product_boosts ADD COLUMN impression_count INTEGER NOT NULL DEFAULT 0`,
      { transaction: t },
    );

    await queryInterface.sequelize.query(
      `CREATE INDEX idx_product_boosts_eligible ON product_boosts (audience_type, state, city) WHERE status = 'active' AND payment_status = 'paid'`,
      { transaction: t },
    );
  });
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS idx_product_boosts_eligible`, { transaction: t });
    await queryInterface.sequelize.query(`ALTER TABLE product_boosts DROP COLUMN impression_count`, { transaction: t });
  });
}

export { up, down };
