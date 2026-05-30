import type { QueryInterface } from 'sequelize';

async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(
      `ALTER TABLE admins DROP CONSTRAINT IF EXISTS admins_role_id_fkey`,
      { transaction: t },
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE admins DROP COLUMN IF EXISTS role_id`,
      { transaction: t },
    );
    await queryInterface.sequelize.query(
      `DROP TABLE IF EXISTS admin_roles`,
      { transaction: t },
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE admins DROP CONSTRAINT IF EXISTS admins_role_check`,
      { transaction: t },
    );
    await queryInterface.sequelize.query(
      `UPDATE admins SET role = 'manager' WHERE role = 'staff'`,
      { transaction: t },
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE admins ADD CONSTRAINT admins_role_check
         CHECK (role IN ('super_admin', 'manager', 'operator'))`,
      { transaction: t },
    );
  });
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(
    `ALTER TABLE admins DROP CONSTRAINT IF EXISTS admins_role_check`,
  );
  await queryInterface.sequelize.query(
    `ALTER TABLE admins ADD CONSTRAINT admins_role_check
       CHECK (role IN ('super_admin', 'staff'))`,
  );
}

export { up, down };
