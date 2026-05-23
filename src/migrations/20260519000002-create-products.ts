import type { QueryInterface } from 'sequelize';

async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(
      `CREATE TABLE products (
        id              SERIAL PRIMARY KEY,
        seller_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        category_id     INTEGER NOT NULL REFERENCES categories(id),
        name            VARCHAR(255) NOT NULL,
        description     TEXT NOT NULL,
        selling_price   DECIMAL(10,2) NOT NULL,
        mrp             DECIMAL(10,2),
        cost_price      DECIMAL(10,2),
        stock           INTEGER NOT NULL DEFAULT 0,
        images          JSONB NOT NULL DEFAULT '[]',
        attributes      JSONB NOT NULL DEFAULT '{}',
        pickup_address  TEXT,
        pickup_lat      DECIMAL(10,7),
        pickup_long     DECIMAL(10,7),
        is_active       BOOLEAN NOT NULL DEFAULT TRUE,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      { transaction: t },
    );

    await queryInterface.sequelize.query(
      `CREATE INDEX idx_products_seller_id   ON products(seller_id)`,
      { transaction: t },
    );
    await queryInterface.sequelize.query(
      `CREATE INDEX idx_products_category_id ON products(category_id)`,
      { transaction: t },
    );
    await queryInterface.sequelize.query(
      `CREATE INDEX idx_products_is_active   ON products(is_active)`,
      { transaction: t },
    );
  });
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(`DROP TABLE IF EXISTS products`);
}

export { up, down };
