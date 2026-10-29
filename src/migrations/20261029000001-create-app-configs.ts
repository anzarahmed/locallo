import type { QueryInterface } from 'sequelize';

async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(
      `CREATE TABLE app_configs (
        id                 SERIAL PRIMARY KEY,
        app                VARCHAR(20) NOT NULL CHECK (app IN ('customer', 'seller')),
        platform           VARCHAR(20) NOT NULL CHECK (platform IN ('android', 'ios')),
        version_code       INTEGER NOT NULL DEFAULT 1 CHECK (version_code >= 1),
        is_force_update    BOOLEAN NOT NULL DEFAULT FALSE,
        is_app_maintenance BOOLEAN NOT NULL DEFAULT FALSE,
        created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (app, platform)
      )`,
      { transaction: t },
    );
    await queryInterface.sequelize.query(
      `INSERT INTO app_configs (app, platform) VALUES
        ('customer', 'android'), ('customer', 'ios'),
        ('seller',   'android'), ('seller',   'ios')`,
      { transaction: t },
    );
  });
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(`DROP TABLE IF EXISTS app_configs`);
}

export { up, down };
