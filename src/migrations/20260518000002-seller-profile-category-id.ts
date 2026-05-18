import type { QueryInterface } from 'sequelize';

async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(
      `ALTER TABLE seller_profiles ADD COLUMN category_id INTEGER REFERENCES categories(id)`,
      { transaction: t },
    );

    await queryInterface.sequelize.query(
      `UPDATE seller_profiles sp
       SET category_id = c.id
       FROM categories c
       WHERE sp.category = c.name`,
      { transaction: t },
    );

    await queryInterface.sequelize.query(
      `ALTER TABLE seller_profiles DROP COLUMN category`,
      { transaction: t },
    );
  });
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(
      `ALTER TABLE seller_profiles ADD COLUMN category TEXT`,
      { transaction: t },
    );

    await queryInterface.sequelize.query(
      `UPDATE seller_profiles sp
       SET category = c.name
       FROM categories c
       WHERE sp.category_id = c.id`,
      { transaction: t },
    );

    await queryInterface.sequelize.query(
      `ALTER TABLE seller_profiles DROP COLUMN category_id`,
      { transaction: t },
    );
  });
}

export { up, down };
