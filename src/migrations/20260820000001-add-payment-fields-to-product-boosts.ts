import type { QueryInterface } from 'sequelize';

async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(
      `ALTER TABLE product_boosts ADD COLUMN razorpay_order_id VARCHAR(255) NOT NULL DEFAULT ''`,
      { transaction: t },
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE product_boosts ALTER COLUMN razorpay_order_id DROP DEFAULT`,
      { transaction: t },
    );

    await queryInterface.sequelize.query(
      `ALTER TABLE product_boosts ADD COLUMN payment_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed'))`,
      { transaction: t },
    );

    await queryInterface.sequelize.query(
      `ALTER TABLE product_boosts ADD COLUMN amount INTEGER NOT NULL DEFAULT 0`,
      { transaction: t },
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE product_boosts ALTER COLUMN amount DROP DEFAULT`,
      { transaction: t },
    );

    await queryInterface.sequelize.query(
      `ALTER TABLE product_boosts ADD COLUMN currency VARCHAR(10) NOT NULL DEFAULT 'INR'`,
      { transaction: t },
    );

    await queryInterface.sequelize.query(
      `ALTER TABLE product_boosts ADD COLUMN razorpay_payment_id VARCHAR(255)`,
      { transaction: t },
    );

    await queryInterface.sequelize.query(
      `ALTER TABLE product_boosts ADD COLUMN razorpay_signature VARCHAR(512)`,
      { transaction: t },
    );
  });
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(
      `ALTER TABLE product_boosts
         DROP COLUMN IF EXISTS razorpay_order_id,
         DROP COLUMN IF EXISTS payment_status,
         DROP COLUMN IF EXISTS amount,
         DROP COLUMN IF EXISTS currency,
         DROP COLUMN IF EXISTS razorpay_payment_id,
         DROP COLUMN IF EXISTS razorpay_signature`,
      { transaction: t },
    );
  });
}

export { up, down };
