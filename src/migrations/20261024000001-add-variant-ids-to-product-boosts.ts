import type { QueryInterface } from 'sequelize';

async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    // Variant UUIDs promoted by the boost; NULL = whole-product boost. An array rather than
    // a junction table because IDs of deleted options are deliberately kept (no FK).
    await queryInterface.sequelize.query(
      `ALTER TABLE product_boosts ADD COLUMN variant_ids UUID[]`,
      { transaction: t },
    );

    await queryInterface.sequelize.query(
      `ALTER TABLE product_boosts ADD CONSTRAINT product_boosts_variant_ids_not_empty
         CHECK (variant_ids IS NULL OR cardinality(variant_ids) > 0)`,
      { transaction: t },
    );

    await queryInterface.sequelize.query(
      `CREATE INDEX idx_product_boosts_variant_ids ON product_boosts USING GIN (variant_ids)`,
      { transaction: t },
    );

    await queryInterface.sequelize.query(
      `UPDATE product_boosts SET variant_ids = ARRAY[variant_id] WHERE variant_id IS NOT NULL`,
      { transaction: t },
    );
  });
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS idx_product_boosts_variant_ids`, { transaction: t });
    await queryInterface.sequelize.query(
      `ALTER TABLE product_boosts DROP CONSTRAINT IF EXISTS product_boosts_variant_ids_not_empty`,
      { transaction: t },
    );
    await queryInterface.sequelize.query(`ALTER TABLE product_boosts DROP COLUMN variant_ids`, { transaction: t });
  });
}

export { up, down };
