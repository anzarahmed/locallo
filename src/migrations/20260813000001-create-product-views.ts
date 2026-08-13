import type { QueryInterface } from 'sequelize';

async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(
      `CREATE TABLE product_views (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        product_id   UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        seller_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        viewed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      { transaction: t },
    );

    await queryInterface.sequelize.query(
      `CREATE INDEX idx_product_views_product_viewed ON product_views (product_id, viewed_at DESC)`,
      { transaction: t },
    );

    await queryInterface.sequelize.query(
      `CREATE INDEX idx_product_views_seller_viewed ON product_views (seller_id, viewed_at DESC)`,
      { transaction: t },
    );

    await queryInterface.sequelize.query(
      `CREATE INDEX idx_product_views_dedup ON product_views (customer_id, product_id, viewed_at DESC)`,
      { transaction: t },
    );
  });
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(`DROP TABLE IF EXISTS product_views`);
}

export { up, down };
