import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

async function up(queryInterface: QueryInterface): Promise<void> {
  const table = await queryInterface.describeTable('users');
  if (!table.profile_image) {
    await queryInterface.addColumn('users', 'profile_image', {
      type: DataTypes.TEXT,
      allowNull: true,
    });
  }
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.removeColumn('users', 'profile_image');
}

export { up, down };
