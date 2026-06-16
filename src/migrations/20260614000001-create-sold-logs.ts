import type { QueryInterface } from 'sequelize';

async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(
      `CREATE TABLE sold_logs (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        seller_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        product_id      UUID REFERENCES products(id) ON DELETE SET NULL,
        variant_id      UUID REFERENCES product_variants(id) ON DELETE SET NULL,
        quantity        INTEGER NOT NULL CHECK (quantity > 0),
        stock_before    INTEGER NOT NULL,
        stock_after     INTEGER NOT NULL,
        product_name    VARCHAR(255) NOT NULL,
        variant_info    JSONB,
        sold_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      { transaction: t },
    );

    await queryInterface.sequelize.query(
      `CREATE INDEX sold_logs_seller_sold_at_idx ON sold_logs (seller_id, sold_at DESC)`,
      { transaction: t },
    );
  });
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(`DROP TABLE IF EXISTS sold_logs`);
}

export { up, down };
