import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.removeColumn('banners', 'sort_order');
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.addColumn('banners', 'sort_order', {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  });
}

export { up, down };
