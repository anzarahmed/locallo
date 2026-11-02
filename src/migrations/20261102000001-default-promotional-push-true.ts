import type { QueryInterface } from 'sequelize';

async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query('ALTER TABLE users ALTER COLUMN promotional_push SET DEFAULT true');
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query('ALTER TABLE users ALTER COLUMN promotional_push SET DEFAULT false');
}

export { up, down };
