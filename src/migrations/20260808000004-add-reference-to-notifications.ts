import type { QueryInterface } from 'sequelize';

async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(
      `ALTER TABLE notifications ADD COLUMN reference_type VARCHAR(30)`,
      { transaction: t },
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE notifications ADD COLUMN reference_id VARCHAR(64)`,
      { transaction: t },
    );
  });
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(`ALTER TABLE notifications DROP COLUMN reference_type`, { transaction: t });
    await queryInterface.sequelize.query(`ALTER TABLE notifications DROP COLUMN reference_id`, { transaction: t });
  });
}

export { up, down };
