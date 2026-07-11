import type { QueryInterface } from 'sequelize';

async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(`ALTER TABLE users DROP CONSTRAINT users_mobile_key`, {
      transaction: t,
    });
    await queryInterface.sequelize.query(
      `ALTER TABLE users ADD CONSTRAINT users_mobile_role_key UNIQUE (mobile, role)`,
      { transaction: t },
    );
  });
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(`ALTER TABLE users DROP CONSTRAINT users_mobile_role_key`, {
      transaction: t,
    });
    await queryInterface.sequelize.query(`ALTER TABLE users ADD CONSTRAINT users_mobile_key UNIQUE (mobile)`, {
      transaction: t,
    });
  });
}

export { up, down };
