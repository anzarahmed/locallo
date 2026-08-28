import type { QueryInterface } from 'sequelize';

async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(
      `CREATE TABLE expenses (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        seller_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        ledger_id    UUID NOT NULL REFERENCES seller_ledgers(id) ON DELETE CASCADE,
        amount       DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
        description  VARCHAR(255),
        expense_date DATE NOT NULL,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      { transaction: t },
    );

    await queryInterface.sequelize.query(
      `CREATE INDEX expenses_seller_date_idx ON expenses (seller_id, expense_date DESC)`,
      { transaction: t },
    );
  });
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(`DROP TABLE IF EXISTS expenses`);
}

export { up, down };
