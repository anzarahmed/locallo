import type { QueryInterface } from 'sequelize';

async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query("UPDATE users SET promotional_push = true WHERE role = 'CUSTOMER'");
}

// The previous per-customer values were not recorded, so they can't be restored.
async function down(): Promise<void> {
  return Promise.resolve();
}

export { up, down };
