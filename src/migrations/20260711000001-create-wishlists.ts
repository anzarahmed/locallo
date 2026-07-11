import type { QueryInterface } from 'sequelize';

async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(
      `CREATE TABLE wishlists (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        product_id   UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (customer_id, product_id)
      )`,
      { transaction: t },
    );

    await queryInterface.sequelize.query(
      `CREATE INDEX idx_wishlists_customer_id ON wishlists(customer_id)`,
      { transaction: t },
    );

    await queryInterface.sequelize.query(
      `CREATE INDEX idx_wishlists_product_id ON wishlists(product_id)`,
      { transaction: t },
    );
  });
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(`DROP TABLE IF EXISTS wishlists`);
}

export { up, down };
