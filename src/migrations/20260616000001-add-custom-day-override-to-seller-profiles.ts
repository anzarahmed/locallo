import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.addColumn('seller_profiles', 'custom_day_override', {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: null,
  });
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.removeColumn('seller_profiles', 'custom_day_override');
}

export { up, down };
