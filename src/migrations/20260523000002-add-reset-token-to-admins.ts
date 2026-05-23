import type { QueryInterface, DataTypes as DataTypesType } from 'sequelize';

async function up(queryInterface: QueryInterface, DataTypes: typeof DataTypesType): Promise<void> {
  await queryInterface.addColumn('admins', 'reset_token', {
    type: DataTypes.TEXT,
    allowNull: true,
  });
  await queryInterface.addColumn('admins', 'reset_token_expires_at', {
    type: DataTypes.DATE,
    allowNull: true,
  });
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.removeColumn('admins', 'reset_token');
  await queryInterface.removeColumn('admins', 'reset_token_expires_at');
}

export { up, down };
