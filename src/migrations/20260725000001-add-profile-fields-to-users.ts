import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

async function up(queryInterface: QueryInterface): Promise<void> {
  const table = await queryInterface.describeTable('users');

  if (!table.email) {
    await queryInterface.addColumn('users', 'email', {
      type: DataTypes.TEXT,
      allowNull: true,
    });
  }

  if (!table.date_of_birth) {
    await queryInterface.addColumn('users', 'date_of_birth', {
      type: DataTypes.DATEONLY,
      allowNull: true,
    });
  }

  if (!table.gender) {
    await queryInterface.addColumn('users', 'gender', {
      type: DataTypes.ENUM('male', 'female', 'other'),
      allowNull: true,
    });
  }
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.removeColumn('users', 'email');
  await queryInterface.removeColumn('users', 'date_of_birth');
  await queryInterface.removeColumn('users', 'gender');
  await queryInterface.sequelize.query(`DROP TYPE IF EXISTS enum_users_gender`);
}

export { up, down };
