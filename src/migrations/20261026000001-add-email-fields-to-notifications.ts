import type { QueryInterface } from 'sequelize';

async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(
      `CREATE TYPE enum_notifications_email_status AS ENUM ('skipped', 'pending', 'sent', 'failed')`,
      { transaction: t },
    );
    // email_status NULL = the notification type has no email.
    await queryInterface.sequelize.query(
      `ALTER TABLE notifications
         ADD COLUMN email_status      enum_notifications_email_status,
         ADD COLUMN email_content     JSONB,
         ADD COLUMN email_attempts    SMALLINT NOT NULL DEFAULT 0,
         ADD COLUMN email_last_error  TEXT,
         ADD COLUMN email_sent_at     TIMESTAMPTZ,
         ADD COLUMN email_send_after  TIMESTAMPTZ`,
      { transaction: t },
    );
    await queryInterface.sequelize.query(
      `CREATE INDEX idx_notifications_email_pending ON notifications (email_send_after) WHERE email_status = 'pending'`,
      { transaction: t },
    );
  });
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS idx_notifications_email_pending`, { transaction: t });
    await queryInterface.sequelize.query(
      `ALTER TABLE notifications
         DROP COLUMN email_status, DROP COLUMN email_content, DROP COLUMN email_attempts,
         DROP COLUMN email_last_error, DROP COLUMN email_sent_at, DROP COLUMN email_send_after`,
      { transaction: t },
    );
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS enum_notifications_email_status`, { transaction: t });
  });
}

export { up, down };
