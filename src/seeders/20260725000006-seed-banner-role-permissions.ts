import type { QueryInterface } from 'sequelize';

const ALL_ACTIONS = ['list', 'view', 'add', 'edit', 'delete'] as const;
const OPERATOR_ACTIONS = ['list', 'view'] as const;

function rows(role: string, actions: readonly string[]): object[] {
  const now = new Date();
  return actions.map(action => ({ role, module: 'banners', action, created_at: now, updated_at: now }));
}

async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.bulkInsert('role_permissions', [
    ...rows('manager', ALL_ACTIONS),
    ...rows('operator', OPERATOR_ACTIONS),
  ]);
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.bulkDelete('role_permissions', { module: 'banners' });
}

export { up, down };
