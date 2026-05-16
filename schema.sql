DROP VIEW IF EXISTS sellers_full;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS seller_profiles;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS admins;

CREATE TABLE admins (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email         TEXT        UNIQUE NOT NULL,
    password_hash TEXT        NOT NULL,
    role          TEXT        NOT NULL CHECK (role IN ('super_admin', 'manager', 'operator')),
    managed_by    UUID        REFERENCES admins(id) ON DELETE SET NULL,
    permissions   JSONB       NOT NULL DEFAULT '{}',
    is_active     BOOL        NOT NULL DEFAULT true,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
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
);

CREATE TABLE seller_profiles (
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
    is_verified   BOOL        NOT NULL DEFAULT false,
    verified_by   UUID        REFERENCES admins(id),
    verified_at   TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT verified_fields_consistent CHECK ((verified_by IS NULL) = (verified_at IS NULL))
);

CREATE TABLE sessions (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_type TEXT        NOT NULL CHECK (actor_type IN ('user', 'admin')),
    actor_id   UUID        NOT NULL,
    token_hash TEXT        NOT NULL,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_logs (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_type   TEXT        NOT NULL CHECK (actor_type IN ('user', 'admin')),
    actor_id     UUID        NOT NULL,
    action       TEXT        NOT NULL,
    target_table TEXT,
    target_id    UUID,
    metadata     JSONB       NOT NULL DEFAULT '{}',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON users (mobile);
CREATE INDEX ON users (role);
CREATE INDEX ON admins (email);
CREATE INDEX ON admins (managed_by);
CREATE INDEX ON seller_profiles (user_id);
CREATE INDEX ON seller_profiles (created_by);
CREATE INDEX ON seller_profiles (is_verified);
CREATE INDEX ON seller_profiles (lat, long);
CREATE INDEX ON sessions (actor_type, actor_id);
CREATE INDEX ON sessions (token_hash);
CREATE INDEX ON sessions (expires_at);
CREATE INDEX ON audit_logs (actor_type, actor_id);
CREATE INDEX ON audit_logs (action);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER admins_updated_at
    BEFORE UPDATE ON admins
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER seller_profiles_updated_at
    BEFORE UPDATE ON seller_profiles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION check_seller_role()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF (SELECT role FROM users WHERE id = NEW.user_id) <> 'seller' THEN
        RAISE EXCEPTION 'seller_profiles.user_id must reference a user with role = ''seller''';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER seller_profiles_check_role
    BEFORE INSERT OR UPDATE ON seller_profiles
    FOR EACH ROW EXECUTE FUNCTION check_seller_role();

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
WHERE u.role = 'seller';

DO $$
DECLARE
    v_super_admin_id UUID := '11111111-1111-1111-1111-111111111111';
    v_manager_id     UUID := '22222222-2222-2222-2222-222222222222';
    v_operator_id    UUID := '33333333-3333-3333-3333-333333333333';
    v_customer_id    UUID := '44444444-4444-4444-4444-444444444444';
    v_seller_id      UUID := '55555555-5555-5555-5555-555555555555';
BEGIN
    INSERT INTO admins (id, email, password_hash, role, managed_by)
    VALUES (
        v_super_admin_id,
        'superadmin@localo.in',
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewYpfQN4K1n.nJ5a',
        'super_admin',
        NULL
    );

    INSERT INTO admins (id, email, password_hash, role, managed_by)
    VALUES (
        v_manager_id,
        'manager@localo.in',
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewYpfQN4K1n.nJ5a',
        'manager',
        v_super_admin_id
    );

    INSERT INTO admins (id, email, password_hash, role, managed_by)
    VALUES (
        v_operator_id,
        'operator@localo.in',
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewYpfQN4K1n.nJ5a',
        'operator',
        v_manager_id
    );

    INSERT INTO users (id, mobile, role, full_name, is_verified)
    VALUES (
        v_customer_id,
        '+919876543210',
        'customer',
        'Rahul Sharma',
        true
    );

    INSERT INTO users (id, mobile, role, full_name, is_verified)
    VALUES (
        v_seller_id,
        '+919876543211',
        'seller',
        'Priya Singh',
        true
    );

    INSERT INTO seller_profiles (
        user_id, created_by, business_name, email,
        lat, long, address, city, state, pincode,
        is_verified, verified_by, verified_at
    )
    VALUES (
        v_seller_id,
        v_super_admin_id,
        'Priya Grocery Store',
        'priya.store@example.com',
        28.613939,
        77.209023,
        '12 Connaught Place',
        'New Delhi',
        'Delhi',
        '110001',
        true,
        v_super_admin_id,
        now()
    );
END $$;
