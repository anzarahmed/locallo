import type { QueryInterface } from 'sequelize';

async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(
      `CREATE TYPE enum_offer_seller_notifications_status AS ENUM ('pending', 'sent', 'failed')`,
      { transaction: t },
    );

    await queryInterface.sequelize.query(
      `CREATE TABLE offer_seller_notifications (
        id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        offer_id                  INTEGER NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
        seller_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        email_status              enum_offer_seller_notifications_status NOT NULL DEFAULT 'pending',
        email_attempts            SMALLINT NOT NULL DEFAULT 0,
        email_last_error          TEXT,
        email_sent_at             TIMESTAMPTZ,

        notification_status       enum_offer_seller_notifications_status NOT NULL DEFAULT 'pending',
        notification_attempts     SMALLINT NOT NULL DEFAULT 0,
        notification_last_error   TEXT,
        notification_sent_at      TIMESTAMPTZ,

        created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        UNIQUE (offer_id, seller_id)
      )`,
      { transaction: t },
    );

    await queryInterface.sequelize.query(
      `CREATE INDEX idx_offer_seller_notifications_pending ON offer_seller_notifications(email_status, notification_status)`,
      { transaction: t },
    );
    await queryInterface.sequelize.query(
      `CREATE INDEX idx_offer_seller_notifications_offer_id ON offer_seller_notifications(offer_id)`,
      { transaction: t },
    );
    await queryInterface.sequelize.query(
      `CREATE INDEX idx_offer_seller_notifications_seller_id ON offer_seller_notifications(seller_id)`,
      { transaction: t },
    );
  });
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS offer_seller_notifications`, { transaction: t });
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS enum_offer_seller_notifications_status`, { transaction: t });
  });
}

export { up, down };
