import type { QueryInterface } from 'sequelize';

async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(
      `ALTER TABLE products ADD COLUMN new_id UUID NOT NULL DEFAULT gen_random_uuid()`,
      { transaction: t },
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE products DROP CONSTRAINT products_pkey`,
      { transaction: t },
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE products DROP COLUMN id`,
      { transaction: t },
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE products RENAME COLUMN new_id TO id`,
      { transaction: t },
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE products ADD PRIMARY KEY (id)`,
      { transaction: t },
    );
  });
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(
      `ALTER TABLE products ADD COLUMN new_id SERIAL`,
      { transaction: t },
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE products DROP CONSTRAINT products_pkey`,
      { transaction: t },
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE products DROP COLUMN id`,
      { transaction: t },
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE products RENAME COLUMN new_id TO id`,
      { transaction: t },
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE products ADD PRIMARY KEY (id)`,
      { transaction: t },
    );
  });
}

export { up, down };
