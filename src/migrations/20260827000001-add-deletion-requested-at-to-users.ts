import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

async function up(queryInterface: QueryInterface): Promise<void> {
  const table = await queryInterface.describeTable('users');
  if (!table.deletion_requested_at) {
    await queryInterface.addColumn('users', 'deletion_requested_at', {
      type: DataTypes.DATE,
      allowNull: true,
    });
  }
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.removeColumn('users', 'deletion_requested_at');
}

export { up, down };
