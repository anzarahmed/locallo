import type { QueryInterface } from 'sequelize';
import bcrypt from 'bcrypt';

async function up(queryInterface: QueryInterface): Promise<void> {
  const passwordHash = await bcrypt.hash('Test@123', 10);

  await queryInterface.sequelize.query(
    `INSERT INTO admins (id, email, password_hash, role, permissions, is_active, created_at, updated_at)
     VALUES (gen_random_uuid(), 'admin@yopmail.com', :passwordHash, 'super_admin', '{}', true, now(), now())
     ON CONFLICT (email) DO NOTHING`,
    { replacements: { passwordHash } },
  );
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(
    `DELETE FROM admins WHERE email = 'admin@yopmail.com'`,
  );
}

export { up, down };
