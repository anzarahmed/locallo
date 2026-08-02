import type { QueryInterface } from 'sequelize';

async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(
    `CREATE TABLE cms_pages (
      id         SERIAL PRIMARY KEY,
      title      TEXT NOT NULL,
      slug       VARCHAR(150) NOT NULL UNIQUE,
      content    TEXT NOT NULL,
      is_active  BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
  );
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(`DROP TABLE IF EXISTS cms_pages`);
}

export { up, down };
