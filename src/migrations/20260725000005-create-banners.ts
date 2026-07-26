import type { QueryInterface } from 'sequelize';

async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(
    `CREATE TABLE banners (
      id          SERIAL PRIMARY KEY,
      brand_id    INTEGER NOT NULL REFERENCES brands(id),
      image       VARCHAR(500) NOT NULL,
      title       VARCHAR(150),
      start_date  DATE NOT NULL,
      end_date    DATE NOT NULL,
      is_active   BOOLEAN NOT NULL DEFAULT TRUE,
      sort_order  INTEGER NOT NULL DEFAULT 0,
      created_by  UUID REFERENCES admins(id),
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
  );
  await queryInterface.sequelize.query(`CREATE INDEX banners_brand_id_idx ON banners(brand_id)`);
  await queryInterface.sequelize.query(`CREATE INDEX banners_is_active_idx ON banners(is_active)`);
  await queryInterface.sequelize.query(`CREATE INDEX banners_date_range_idx ON banners(start_date, end_date)`);
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(`DROP TABLE IF EXISTS banners`);
}

export { up, down };
