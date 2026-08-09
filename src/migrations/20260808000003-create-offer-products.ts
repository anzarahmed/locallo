import type { QueryInterface } from 'sequelize';

async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(
      `CREATE TABLE offer_products (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        offer_id     INTEGER NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
        seller_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        product_id   UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (offer_id, product_id)
      )`,
      { transaction: t },
    );

    await queryInterface.sequelize.query(
      `CREATE INDEX idx_offer_products_offer_id ON offer_products(offer_id)`,
      { transaction: t },
    );
    await queryInterface.sequelize.query(
      `CREATE INDEX idx_offer_products_seller_id ON offer_products(seller_id)`,
      { transaction: t },
    );
    await queryInterface.sequelize.query(
      `CREATE INDEX idx_offer_products_product_id ON offer_products(product_id)`,
      { transaction: t },
    );
  });
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(`DROP TABLE IF EXISTS offer_products`);
}

export { up, down };
