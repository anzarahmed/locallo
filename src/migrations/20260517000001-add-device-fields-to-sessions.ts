import type { QueryInterface } from 'sequelize';

async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(
      `ALTER TABLE sessions ADD COLUMN device_id TEXT`,
      { transaction: t },
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE sessions ADD COLUMN device_type TEXT`,
      { transaction: t },
    );
    await queryInterface.sequelize.query(
      `CREATE INDEX ON sessions (device_id)`,
      { transaction: t },
    );
  });
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(
      `ALTER TABLE sessions DROP COLUMN IF EXISTS device_type`,
      { transaction: t },
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE sessions DROP COLUMN IF EXISTS device_id`,
      { transaction: t },
    );
  });
}

export { up, down };
