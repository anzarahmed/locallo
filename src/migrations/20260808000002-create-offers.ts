import type { QueryInterface } from 'sequelize';

async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(
      `CREATE TYPE enum_offers_offer_type AS ENUM ('percentage_off', 'flat_amount_off', 'bogo')`,
      { transaction: t },
    );

    await queryInterface.sequelize.query(
      `CREATE TABLE offers (
        id                  SERIAL PRIMARY KEY,
        title               VARCHAR(150) NOT NULL,
        description         TEXT,
        image               VARCHAR(500) NOT NULL,
        start_date          TIMESTAMPTZ NOT NULL,
        end_date            TIMESTAMPTZ NOT NULL,
        offer_type          enum_offers_offer_type NOT NULL,
        config              JSONB NOT NULL,
        is_active           BOOLEAN NOT NULL DEFAULT TRUE,
        created_by          UUID REFERENCES admins(id),
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      { transaction: t },
    );

    await queryInterface.sequelize.query(`CREATE INDEX idx_offers_is_active ON offers(is_active)`, { transaction: t });
    await queryInterface.sequelize.query(
      `CREATE INDEX idx_offers_date_range ON offers(start_date, end_date)`,
      { transaction: t },
    );
  });
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS offers`, { transaction: t });
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS enum_offers_offer_type`, { transaction: t });
  });
}

export { up, down };
