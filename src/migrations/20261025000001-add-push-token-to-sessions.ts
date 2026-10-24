import type { QueryInterface } from 'sequelize';

async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(
      `ALTER TABLE sessions ADD COLUMN push_token TEXT, ADD COLUMN push_token_updated_at TIMESTAMPTZ`,
      { transaction: t },
    );
    await queryInterface.sequelize.query(
      `CREATE UNIQUE INDEX idx_sessions_push_token ON sessions (push_token) WHERE push_token IS NOT NULL`,
      { transaction: t },
    );
  });
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS idx_sessions_push_token`, { transaction: t });
    await queryInterface.sequelize.query(
      `ALTER TABLE sessions DROP COLUMN push_token, DROP COLUMN push_token_updated_at`,
      { transaction: t },
    );
  });
}

export { up, down };
