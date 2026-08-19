import type { QueryInterface } from 'sequelize';

async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(
      `CREATE TABLE product_boosts (
        id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        seller_id                  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        product_id                 UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        audience_type              VARCHAR(20) NOT NULL CHECK (audience_type IN ('pan_india', 'state', 'city')),
        state                      VARCHAR(100),
        city                       VARCHAR(100),
        daily_budget               INTEGER NOT NULL,
        estimated_impressions_min  INTEGER NOT NULL,
        estimated_impressions_max  INTEGER NOT NULL,
        status                     VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
        created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      { transaction: t },
    );

    await queryInterface.sequelize.query(
      `CREATE INDEX idx_product_boosts_product_active ON product_boosts (product_id) WHERE status = 'active'`,
      { transaction: t },
    );

    await queryInterface.sequelize.query(
      `CREATE INDEX idx_product_boosts_seller_created ON product_boosts (seller_id, created_at DESC)`,
      { transaction: t },
    );
  });
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(`DROP TABLE IF EXISTS product_boosts`);
}

export { up, down };
