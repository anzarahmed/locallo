import type { QueryInterface } from 'sequelize';

async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(
      `ALTER TABLE users
         ADD COLUMN last_active_at   TIMESTAMPTZ,
         ADD COLUMN first_login_at   TIMESTAMPTZ,
         ADD COLUMN promotional_push BOOLEAN NOT NULL DEFAULT false`,
      { transaction: t },
    );
    // Backfilled to now so the 30-day inactivity reminder doesn't fire for everyone on deploy.
    await queryInterface.sequelize.query(`UPDATE users SET last_active_at = NOW()`, { transaction: t });
    // is_verified flips on the first successful OTP login, so verified users have logged in before.
    await queryInterface.sequelize.query(
      `UPDATE users SET first_login_at = created_at WHERE is_verified = true`,
      { transaction: t },
    );
  });
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(
    `ALTER TABLE users DROP COLUMN last_active_at, DROP COLUMN first_login_at, DROP COLUMN promotional_push`,
  );
}

export { up, down };
