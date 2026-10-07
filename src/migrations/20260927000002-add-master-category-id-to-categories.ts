import type { QueryInterface } from 'sequelize';

async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(
      `ALTER TABLE categories ADD COLUMN master_category_id INTEGER NULL REFERENCES master_categories(id)`,
      { transaction: t },
    );
    await queryInterface.sequelize.query(
      `CREATE INDEX idx_categories_master_category_id ON categories(master_category_id)`,
      { transaction: t },
    );
  });
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS idx_categories_master_category_id`, { transaction: t });
    await queryInterface.sequelize.query(`ALTER TABLE categories DROP COLUMN IF EXISTS master_category_id`, { transaction: t });
  });
}

export { up, down };
