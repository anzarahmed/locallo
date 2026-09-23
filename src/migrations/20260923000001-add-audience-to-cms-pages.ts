import type { QueryInterface } from 'sequelize';

async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(
      `CREATE TYPE enum_cms_pages_audience AS ENUM ('customer', 'seller')`,
      { transaction: t },
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE cms_pages ADD COLUMN audience enum_cms_pages_audience NOT NULL DEFAULT 'customer'`,
      { transaction: t },
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE cms_pages DROP CONSTRAINT cms_pages_slug_key`,
      { transaction: t },
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE cms_pages ADD CONSTRAINT cms_pages_audience_slug_key UNIQUE (audience, slug)`,
      { transaction: t },
    );
    await queryInterface.sequelize.query(
      `CREATE INDEX cms_pages_audience_is_active_idx ON cms_pages (audience, is_active)`,
      { transaction: t },
    );
  });
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    // Seller rows may reuse customer slugs, which would violate the restored slug-only unique constraint.
    await queryInterface.sequelize.query(`DELETE FROM cms_pages WHERE audience = 'seller'`, { transaction: t });
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS cms_pages_audience_is_active_idx`, { transaction: t });
    await queryInterface.sequelize.query(
      `ALTER TABLE cms_pages DROP CONSTRAINT cms_pages_audience_slug_key`,
      { transaction: t },
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE cms_pages ADD CONSTRAINT cms_pages_slug_key UNIQUE (slug)`,
      { transaction: t },
    );
    await queryInterface.sequelize.query(`ALTER TABLE cms_pages DROP COLUMN audience`, { transaction: t });
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS enum_cms_pages_audience`, { transaction: t });
  });
}

export { up, down };
