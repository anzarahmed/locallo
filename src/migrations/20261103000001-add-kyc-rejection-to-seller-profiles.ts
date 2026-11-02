import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

async function up(queryInterface: QueryInterface): Promise<void> {
  const table = await queryInterface.describeTable('seller_profiles');
  if (!table.kyc_rejection) {
    await queryInterface.addColumn('seller_profiles', 'kyc_rejection', {
      type: DataTypes.JSONB,
      allowNull: true,
    });
  }
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.removeColumn('seller_profiles', 'kyc_rejection');
}

export { up, down };
