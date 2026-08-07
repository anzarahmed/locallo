import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.addColumn('seller_profiles', 'brand_documents', {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
  });
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.removeColumn('seller_profiles', 'brand_documents');
}

export { up, down };
