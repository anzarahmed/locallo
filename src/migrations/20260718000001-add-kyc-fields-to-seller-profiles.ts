import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

async function up(queryInterface: QueryInterface): Promise<void> {
  const table = await queryInterface.describeTable('seller_profiles');
  if (!table.kyc_documents) {
    await queryInterface.addColumn('seller_profiles', 'kyc_documents', {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    });
  }

  // Grandfather existing sellers as verified — only newly-created sellers require KYC.
  // verified_by must be set too (verified_fields_consistent check constraint requires
  // verified_by/verified_at to be null together) — attribute it to the admin who created the seller.
  await queryInterface.sequelize.query(
    `UPDATE seller_profiles SET is_verified = true, verified_by = created_by, verified_at = NOW() WHERE is_verified = false`,
  );
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.removeColumn('seller_profiles', 'kyc_documents');
}

export { up, down };
