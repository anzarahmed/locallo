import type { QueryInterface } from 'sequelize';

const DEFAULT_SETTINGS = JSON.stringify({
  pushNotifications: false,
  emailUpdates: false,
  smsAlerts: false,
  offersAndPromotions: false,
  wishlistPriceDrops: false,
  sellerUpdates: false,
});

async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(
    `ALTER TABLE seller_profiles ADD COLUMN notification_settings JSONB NOT NULL DEFAULT '${DEFAULT_SETTINGS}'`,
  );
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(
    `ALTER TABLE seller_profiles DROP COLUMN notification_settings`,
  );
}

export { up, down };
