import type { QueryInterface } from 'sequelize';

async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(
      `CREATE TABLE seller_ledgers (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        seller_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name       VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      { transaction: t },
    );

    await queryInterface.sequelize.query(
      `CREATE UNIQUE INDEX seller_ledgers_seller_name_idx ON seller_ledgers (seller_id, name)`,
      { transaction: t },
    );
  });
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(`DROP TABLE IF EXISTS seller_ledgers`);
}

export { up, down };
