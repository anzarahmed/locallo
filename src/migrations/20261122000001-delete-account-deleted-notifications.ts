import type { QueryInterface } from 'sequelize';

async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query("DELETE FROM notifications WHERE type = 'account_deleted'");
}

// Deleted inbox rows are not restorable.
async function down(): Promise<void> {}

export { up, down };
