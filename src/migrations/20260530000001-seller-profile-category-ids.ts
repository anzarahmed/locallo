import type { QueryInterface } from 'sequelize';

async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(
      `ALTER TABLE seller_profiles ADD COLUMN category_ids JSONB NOT NULL DEFAULT '[]'`,
      { transaction: t },
    );

    await queryInterface.sequelize.query(
      `UPDATE seller_profiles SET category_ids = jsonb_build_array(category_id) WHERE category_id IS NOT NULL`,
      { transaction: t },
    );

    await queryInterface.sequelize.query(
      `ALTER TABLE seller_profiles DROP COLUMN category_id`,
      { transaction: t },
    );
  });
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(
      `ALTER TABLE seller_profiles ADD COLUMN category_id INTEGER REFERENCES categories(id)`,
      { transaction: t },
    );

    await queryInterface.sequelize.query(
      `UPDATE seller_profiles SET category_id = (category_ids->>0)::INTEGER WHERE jsonb_array_length(category_ids) > 0`,
      { transaction: t },
    );

    await queryInterface.sequelize.query(
      `ALTER TABLE seller_profiles DROP COLUMN category_ids`,
      { transaction: t },
    );
  });
}

export { up, down };
