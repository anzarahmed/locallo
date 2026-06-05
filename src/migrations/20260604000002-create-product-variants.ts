import type { QueryInterface } from 'sequelize';

async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(
      `CREATE TABLE product_variants (
        id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id     UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        attributes     JSONB NOT NULL DEFAULT '{}',
        images         JSONB NOT NULL DEFAULT '[]',
        stock          INTEGER NOT NULL DEFAULT 0,
        selling_price  DECIMAL(10,2),
        mrp            DECIMAL(10,2),
        is_active      BOOLEAN NOT NULL DEFAULT TRUE,
        created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      { transaction: t },
    );

    await queryInterface.sequelize.query(
      `CREATE INDEX idx_product_variants_product_id ON product_variants(product_id)`,
      { transaction: t },
    );
  });
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(`DROP TABLE IF EXISTS product_variants`);
}

export { up, down };
