import type { QueryInterface } from 'sequelize';

async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(
      `ALTER TABLE seller_profiles ADD COLUMN category TEXT`,
      { transaction: t },
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE seller_profiles ADD COLUMN bio TEXT`,
      { transaction: t },
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE seller_profiles ADD COLUMN working_hours JSONB NOT NULL DEFAULT '{}'`,
      { transaction: t },
    );
  });
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(
      `ALTER TABLE seller_profiles DROP COLUMN IF EXISTS working_hours`,
      { transaction: t },
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE seller_profiles DROP COLUMN IF EXISTS bio`,
      { transaction: t },
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE seller_profiles DROP COLUMN IF EXISTS category`,
      { transaction: t },
    );
  });
}

export { up, down };
