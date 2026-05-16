import type { QueryInterface } from 'sequelize';

async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(
      `CREATE TABLE admins (
        id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        email         TEXT        UNIQUE NOT NULL,
        password_hash TEXT        NOT NULL,
        role          TEXT        NOT NULL CHECK (role IN ('super_admin', 'manager', 'operator')),
        managed_by    UUID        REFERENCES admins(id) ON DELETE SET NULL,
        permissions   JSONB       NOT NULL DEFAULT '{}',
        is_active     BOOL        NOT NULL DEFAULT true,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
      )`,
      { transaction: t },
    );

    await queryInterface.sequelize.query(
      `CREATE TABLE users (
        id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        mobile         TEXT        UNIQUE NOT NULL,
        role           TEXT        NOT NULL CHECK (role IN ('customer', 'seller')),
        full_name      TEXT,
        otp_code       TEXT,
        otp_expires_at TIMESTAMPTZ,
        is_verified    BOOL        NOT NULL DEFAULT false,
        is_active      BOOL        NOT NULL DEFAULT true,
        created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
      )`,
      { transaction: t },
    );

    await queryInterface.sequelize.query(
      `CREATE TABLE seller_profiles (
        id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id       UUID         UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_by    UUID         NOT NULL REFERENCES admins(id),
        business_name TEXT         NOT NULL,
        email         TEXT         NOT NULL,
        lat           NUMERIC(9,6) NOT NULL,
        long          NUMERIC(9,6) NOT NULL,
        address       TEXT,
        city          TEXT,
        state         TEXT,
        pincode       TEXT,
        is_verified   BOOL         NOT NULL DEFAULT false,
        verified_by   UUID         REFERENCES admins(id),
        verified_at   TIMESTAMPTZ,
        created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
        updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT verified_fields_consistent CHECK ((verified_by IS NULL) = (verified_at IS NULL))
      )`,
      { transaction: t },
    );

    await queryInterface.sequelize.query(
      `CREATE TABLE sessions (
        id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        actor_type TEXT        NOT NULL CHECK (actor_type IN ('user', 'admin')),
        actor_id   UUID        NOT NULL,
        token_hash TEXT        NOT NULL,
        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`,
      { transaction: t },
    );

    await queryInterface.sequelize.query(
      `CREATE TABLE audit_logs (
        id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        actor_type   TEXT        NOT NULL CHECK (actor_type IN ('user', 'admin')),
        actor_id     UUID        NOT NULL,
        action       TEXT        NOT NULL,
        target_table TEXT,
        target_id    UUID,
        metadata     JSONB       NOT NULL DEFAULT '{}',
        created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
      )`,
      { transaction: t },
    );

    await queryInterface.sequelize.query(`CREATE INDEX ON users (mobile)`, { transaction: t });
    await queryInterface.sequelize.query(`CREATE INDEX ON users (role)`, { transaction: t });
    await queryInterface.sequelize.query(`CREATE INDEX ON admins (email)`, { transaction: t });
    await queryInterface.sequelize.query(`CREATE INDEX ON admins (managed_by)`, { transaction: t });
    await queryInterface.sequelize.query(`CREATE INDEX ON seller_profiles (user_id)`, { transaction: t });
    await queryInterface.sequelize.query(`CREATE INDEX ON seller_profiles (created_by)`, { transaction: t });
    await queryInterface.sequelize.query(`CREATE INDEX ON seller_profiles (is_verified)`, { transaction: t });
    await queryInterface.sequelize.query(`CREATE INDEX ON seller_profiles (lat, long)`, { transaction: t });
    await queryInterface.sequelize.query(`CREATE INDEX ON sessions (actor_type, actor_id)`, { transaction: t });
    await queryInterface.sequelize.query(`CREATE INDEX ON sessions (token_hash)`, { transaction: t });
    await queryInterface.sequelize.query(`CREATE INDEX ON sessions (expires_at)`, { transaction: t });
    await queryInterface.sequelize.query(`CREATE INDEX ON audit_logs (actor_type, actor_id)`, { transaction: t });
    await queryInterface.sequelize.query(`CREATE INDEX ON audit_logs (action)`, { transaction: t });

    await queryInterface.sequelize.query(
      `CREATE OR REPLACE FUNCTION set_updated_at()
       RETURNS TRIGGER LANGUAGE plpgsql AS $$
       BEGIN
         NEW.updated_at = now();
         RETURN NEW;
       END;
       $$`,
      { transaction: t },
    );

    await queryInterface.sequelize.query(
      `CREATE TRIGGER users_updated_at
         BEFORE UPDATE ON users
         FOR EACH ROW EXECUTE FUNCTION set_updated_at()`,
      { transaction: t },
    );

    await queryInterface.sequelize.query(
      `CREATE TRIGGER admins_updated_at
         BEFORE UPDATE ON admins
         FOR EACH ROW EXECUTE FUNCTION set_updated_at()`,
      { transaction: t },
    );

    await queryInterface.sequelize.query(
      `CREATE TRIGGER seller_profiles_updated_at
         BEFORE UPDATE ON seller_profiles
         FOR EACH ROW EXECUTE FUNCTION set_updated_at()`,
      { transaction: t },
    );

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
      `CREATE TRIGGER seller_profiles_check_role
         BEFORE INSERT OR UPDATE ON seller_profiles
         FOR EACH ROW EXECUTE FUNCTION check_seller_role()`,
      { transaction: t },
    );

    await queryInterface.sequelize.query(
      `CREATE VIEW sellers_full AS
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
       WHERE u.role = 'seller'`,
      { transaction: t },
    );
  });
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(`DROP VIEW IF EXISTS sellers_full`, { transaction: t });
    await queryInterface.sequelize.query(`DROP TRIGGER IF EXISTS seller_profiles_check_role ON seller_profiles`, { transaction: t });
    await queryInterface.sequelize.query(`DROP TRIGGER IF EXISTS seller_profiles_updated_at ON seller_profiles`, { transaction: t });
    await queryInterface.sequelize.query(`DROP TRIGGER IF EXISTS admins_updated_at ON admins`, { transaction: t });
    await queryInterface.sequelize.query(`DROP TRIGGER IF EXISTS users_updated_at ON users`, { transaction: t });
    await queryInterface.sequelize.query(`DROP FUNCTION IF EXISTS check_seller_role()`, { transaction: t });
    await queryInterface.sequelize.query(`DROP FUNCTION IF EXISTS set_updated_at()`, { transaction: t });
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS audit_logs`, { transaction: t });
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS sessions`, { transaction: t });
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS seller_profiles`, { transaction: t });
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS users`, { transaction: t });
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS admins`, { transaction: t });
  });
}

export { up, down };
