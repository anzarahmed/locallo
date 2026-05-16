import type { QueryInterface } from 'sequelize';

const VIEW_SQL = `
  CREATE VIEW sellers_full AS
  SELECT
    u.id,
    u.mobile,
    u.full_name,
    u.is_active      AS user_active,
    sp.id            AS profile_id,
    sp.business_name,
    sp.email         AS business_email,
    sp.lat,
    sp.long,
    sp.address,
    sp.city,
    sp.state,
    sp.pincode,
    sp.is_verified,
    sp.verified_at,
    sp.created_by,
    sp.created_at
  FROM users u
  JOIN seller_profiles sp ON sp.user_id = u.id
  WHERE u.role = 'SELLER'
`;

async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(`DROP VIEW IF EXISTS sellers_full`, { transaction: t });

    await queryInterface.sequelize.query(
      `ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check`,
      { transaction: t },
    );

    await queryInterface.sequelize.query(
      `CREATE TYPE user_role AS ENUM ('CUSTOMER', 'SELLER')`,
      { transaction: t },
    );

    await queryInterface.sequelize.query(
      `ALTER TABLE users ALTER COLUMN role TYPE user_role USING upper(role)::user_role`,
      { transaction: t },
    );

    await queryInterface.sequelize.query(
      `CREATE OR REPLACE FUNCTION check_seller_role()
       RETURNS TRIGGER LANGUAGE plpgsql AS $$
       BEGIN
         IF (SELECT role FROM users WHERE id = NEW.user_id) <> 'SELLER' THEN
           RAISE EXCEPTION 'seller_profiles.user_id must reference a user with role = ''SELLER''';
         END IF;
         RETURN NEW;
       END;
       $$`,
      { transaction: t },
    );

    await queryInterface.sequelize.query(VIEW_SQL, { transaction: t });
  });
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(`DROP VIEW IF EXISTS sellers_full`, { transaction: t });

    await queryInterface.sequelize.query(
      `ALTER TABLE users ALTER COLUMN role TYPE TEXT USING lower(role::TEXT)`,
      { transaction: t },
    );

    await queryInterface.sequelize.query(
      `ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('customer', 'seller'))`,
      { transaction: t },
    );

    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS user_role`, { transaction: t });

    await queryInterface.sequelize.query(
      `CREATE OR REPLACE FUNCTION check_seller_role()
       RETURNS TRIGGER LANGUAGE plpgsql AS $$
       BEGIN
         IF (SELECT role FROM users WHERE id = NEW.user_id) <> 'seller' THEN
           RAISE EXCEPTION 'seller_profiles.user_id must reference a user with role = ''seller''';
         END IF;
         RETURN NEW;
       END;
       $$`,
      { transaction: t },
    );

    await queryInterface.sequelize.query(
      `CREATE VIEW sellers_full AS
       SELECT
         u.id, u.mobile, u.full_name,
         u.is_active AS user_active,
         sp.id AS profile_id, sp.business_name,
         sp.email AS business_email, sp.lat, sp.long,
         sp.address, sp.city, sp.state, sp.pincode,
         sp.is_verified, sp.verified_at, sp.created_by, sp.created_at
       FROM users u
       JOIN seller_profiles sp ON sp.user_id = u.id
       WHERE u.role = 'seller'`,
      { transaction: t },
    );
  });
}

export { up, down };
