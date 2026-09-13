import type { QueryInterface } from 'sequelize';

async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(
    `ALTER TABLE seller_profiles ALTER COLUMN notification_settings SET DEFAULT '{"pushNotifications":false,"emailUpdates":false,"smsAlerts":false,"offersAndPromotions":false,"wishlistPriceDrops":false,"sellerUpdates":false,"useAiForPrimaryImage":true}'`,
  );
  await queryInterface.sequelize.query(
    `UPDATE seller_profiles SET notification_settings = notification_settings || '{"useAiForPrimaryImage": true}'::jsonb WHERE NOT (notification_settings ? 'useAiForPrimaryImage')`,
  );
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(
    `ALTER TABLE seller_profiles ALTER COLUMN notification_settings SET DEFAULT '{"pushNotifications":false,"emailUpdates":false,"smsAlerts":false,"offersAndPromotions":false,"wishlistPriceDrops":false,"sellerUpdates":false}'`,
  );
  await queryInterface.sequelize.query(
    `UPDATE seller_profiles SET notification_settings = notification_settings - 'useAiForPrimaryImage'`,
  );
}

export { up, down };
