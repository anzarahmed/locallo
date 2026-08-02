import type { QueryInterface } from 'sequelize';

async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(
      `CREATE TABLE notifications (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title        VARCHAR(150) NOT NULL,
        message      TEXT NOT NULL,
        type         VARCHAR(50) NOT NULL DEFAULT 'general',
        is_read      BOOLEAN NOT NULL DEFAULT false,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      { transaction: t },
    );

    await queryInterface.sequelize.query(
      `CREATE INDEX idx_notifications_customer_id ON notifications(customer_id)`,
      { transaction: t },
    );

    await queryInterface.sequelize.query(
      `CREATE INDEX idx_notifications_customer_id_is_read ON notifications(customer_id, is_read)`,
      { transaction: t },
    );
  });
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(`DROP TABLE IF EXISTS notifications`);
}

export { up, down };
