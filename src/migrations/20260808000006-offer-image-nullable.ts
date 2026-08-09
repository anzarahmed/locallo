import type { QueryInterface } from 'sequelize';

async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(`ALTER TABLE offers ALTER COLUMN image DROP NOT NULL`);
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(`UPDATE offers SET image = '' WHERE image IS NULL`);
  await queryInterface.sequelize.query(`ALTER TABLE offers ALTER COLUMN image SET NOT NULL`);
}

export { up, down };
