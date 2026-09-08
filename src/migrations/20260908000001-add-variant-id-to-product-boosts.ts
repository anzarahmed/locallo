import type { QueryInterface } from 'sequelize';

async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(
      `ALTER TABLE product_boosts ADD COLUMN variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL`,
      { transaction: t },
    );

    await queryInterface.sequelize.query(
      `CREATE INDEX idx_product_boosts_variant_id ON product_boosts (variant_id)`,
      { transaction: t },
    );
  });
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS idx_product_boosts_variant_id`, { transaction: t });
    await queryInterface.sequelize.query(`ALTER TABLE product_boosts DROP COLUMN variant_id`, { transaction: t });
  });
}

export { up, down };
