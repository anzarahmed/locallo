import type { QueryInterface } from 'sequelize';

async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(
      `ALTER TABLE wishlists ADD COLUMN variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE`,
      { transaction: t },
    );

    await queryInterface.sequelize.query(
      `ALTER TABLE wishlists DROP CONSTRAINT wishlists_customer_id_product_id_key`,
      { transaction: t },
    );

    await queryInterface.sequelize.query(
      `CREATE UNIQUE INDEX idx_wishlists_customer_product_no_variant ON wishlists(customer_id, product_id) WHERE variant_id IS NULL`,
      { transaction: t },
    );

    await queryInterface.sequelize.query(
      `CREATE UNIQUE INDEX idx_wishlists_customer_product_variant ON wishlists(customer_id, product_id, variant_id) WHERE variant_id IS NOT NULL`,
      { transaction: t },
    );

    await queryInterface.sequelize.query(
      `CREATE INDEX idx_wishlists_variant_id ON wishlists(variant_id)`,
      { transaction: t },
    );
  });
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS idx_wishlists_variant_id`, { transaction: t });
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS idx_wishlists_customer_product_variant`, { transaction: t });
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS idx_wishlists_customer_product_no_variant`, { transaction: t });
    await queryInterface.sequelize.query(
      `ALTER TABLE wishlists ADD CONSTRAINT wishlists_customer_id_product_id_key UNIQUE (customer_id, product_id)`,
      { transaction: t },
    );
    await queryInterface.sequelize.query(`ALTER TABLE wishlists DROP COLUMN variant_id`, { transaction: t });
  });
}

export { up, down };
