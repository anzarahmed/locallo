import type { QueryInterface, DataTypes as DataTypesType } from 'sequelize';

async function up(queryInterface: QueryInterface, DataTypes: typeof DataTypesType): Promise<void> {
  await queryInterface.addColumn('categories', 'icon', {
    type: DataTypes.STRING(500),
    allowNull: true,
  });
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.removeColumn('categories', 'icon');
}

export { up, down };
