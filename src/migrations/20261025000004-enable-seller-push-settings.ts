import type { QueryInterface } from 'sequelize';

async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(
      `ALTER TABLE seller_profiles ALTER COLUMN notification_settings SET DEFAULT '{"pushNotifications":true,"emailUpdates":false,"smsAlerts":false,"offersAndPromotions":true,"wishlistPriceDrops":false,"sellerUpdates":true,"useAiForPrimaryImage":true,"closingReminder":false}'`,
      { transaction: t },
    );
    await queryInterface.sequelize.query(
      `UPDATE seller_profiles
          SET notification_settings = notification_settings
                || '{"pushNotifications": true, "offersAndPromotions": true, "sellerUpdates": true}'::jsonb
                || jsonb_build_object('closingReminder', COALESCE((notification_settings->>'closingReminder')::boolean, false))`,
      { transaction: t },
    );
  });
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(
      `ALTER TABLE seller_profiles ALTER COLUMN notification_settings SET DEFAULT '{"pushNotifications":false,"emailUpdates":false,"smsAlerts":false,"offersAndPromotions":false,"wishlistPriceDrops":false,"sellerUpdates":false,"useAiForPrimaryImage":true}'`,
      { transaction: t },
    );
    await queryInterface.sequelize.query(
      `UPDATE seller_profiles SET notification_settings = notification_settings - 'closingReminder'`,
      { transaction: t },
    );
  });
}

export { up, down };
