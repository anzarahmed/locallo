import type { QueryInterface } from 'sequelize';

async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    // Sellers share this table with customers, so the owner column is renamed to user_id.
    await queryInterface.sequelize.query(`ALTER TABLE notifications RENAME COLUMN customer_id TO user_id`, { transaction: t });
    await queryInterface.sequelize.query(`ALTER INDEX idx_notifications_customer_id RENAME TO idx_notifications_user_id`, { transaction: t });
    await queryInterface.sequelize.query(
      `ALTER INDEX idx_notifications_customer_id_is_read RENAME TO idx_notifications_user_id_is_read`,
      { transaction: t },
    );
    await queryInterface.sequelize.query(
      `CREATE TYPE enum_notifications_push_status AS ENUM ('skipped', 'pending', 'sent', 'failed')`,
      { transaction: t },
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE notifications
         ADD COLUMN dedupe_key       TEXT,
         ADD COLUMN data             JSONB,
         ADD COLUMN push_options     JSONB,
         ADD COLUMN push_status      enum_notifications_push_status NOT NULL DEFAULT 'skipped',
         ADD COLUMN push_attempts    SMALLINT NOT NULL DEFAULT 0,
         ADD COLUMN push_last_error  TEXT,
         ADD COLUMN push_sent_at     TIMESTAMPTZ,
         ADD COLUMN send_after       TIMESTAMPTZ`,
      { transaction: t },
    );
    await queryInterface.sequelize.query(
      `CREATE UNIQUE INDEX idx_notifications_dedupe_key ON notifications (dedupe_key) WHERE dedupe_key IS NOT NULL`,
      { transaction: t },
    );
    await queryInterface.sequelize.query(
      `CREATE INDEX idx_notifications_push_pending ON notifications (send_after) WHERE push_status = 'pending'`,
      { transaction: t },
    );
    await queryInterface.sequelize.query(
      `CREATE INDEX idx_notifications_user_id_type_created ON notifications (user_id, type, created_at)`,
      { transaction: t },
    );
  });
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS idx_notifications_user_id_type_created`, { transaction: t });
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS idx_notifications_push_pending`, { transaction: t });
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS idx_notifications_dedupe_key`, { transaction: t });
    await queryInterface.sequelize.query(
      `ALTER TABLE notifications
         DROP COLUMN dedupe_key, DROP COLUMN data, DROP COLUMN push_options, DROP COLUMN push_status,
         DROP COLUMN push_attempts, DROP COLUMN push_last_error, DROP COLUMN push_sent_at, DROP COLUMN send_after`,
      { transaction: t },
    );
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS enum_notifications_push_status`, { transaction: t });
    await queryInterface.sequelize.query(
      `ALTER INDEX idx_notifications_user_id_is_read RENAME TO idx_notifications_customer_id_is_read`,
      { transaction: t },
    );
    await queryInterface.sequelize.query(`ALTER INDEX idx_notifications_user_id RENAME TO idx_notifications_customer_id`, { transaction: t });
    await queryInterface.sequelize.query(`ALTER TABLE notifications RENAME COLUMN user_id TO customer_id`, { transaction: t });
  });
}

export { up, down };
