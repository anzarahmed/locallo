import type { QueryInterface } from 'sequelize';

async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(`ALTER TABLE offers DROP COLUMN IF EXISTS image`);
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(`ALTER TABLE offers ADD COLUMN image VARCHAR(500)`);
}

export { up, down };
