import type { QueryInterface } from 'sequelize';

async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(
      `ALTER TABLE seller_profiles ALTER COLUMN notification_settings SET DEFAULT '{"pushNotifications":true,"emailUpdates":true,"smsAlerts":false,"offersAndPromotions":true,"wishlistPriceDrops":false,"sellerUpdates":true,"useAiForPrimaryImage":true,"closingReminder":false}'`,
      { transaction: t },
    );
    await queryInterface.sequelize.query(
      `UPDATE seller_profiles SET notification_settings = notification_settings || '{"emailUpdates": true}'::jsonb`,
      { transaction: t },
    );
  });
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(
    `ALTER TABLE seller_profiles ALTER COLUMN notification_settings SET DEFAULT '{"pushNotifications":true,"emailUpdates":false,"smsAlerts":false,"offersAndPromotions":true,"wishlistPriceDrops":false,"sellerUpdates":true,"useAiForPrimaryImage":true,"closingReminder":false}'`,
  );
}

export { up, down };
