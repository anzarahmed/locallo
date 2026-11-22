import type { QueryInterface } from 'sequelize';

async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(
    `ALTER TABLE users
       ADD COLUMN otp_attempts          INTEGER NOT NULL DEFAULT 0,
       ADD COLUMN otp_last_sent_at      TIMESTAMPTZ,
       ADD COLUMN otp_send_count        INTEGER NOT NULL DEFAULT 0,
       ADD COLUMN otp_send_window_start TIMESTAMPTZ,
       ADD COLUMN otp_locked_until      TIMESTAMPTZ`,
  );
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(
    `ALTER TABLE users
       DROP COLUMN otp_attempts,
       DROP COLUMN otp_last_sent_at,
       DROP COLUMN otp_send_count,
       DROP COLUMN otp_send_window_start,
       DROP COLUMN otp_locked_until`,
  );
}

export { up, down };
