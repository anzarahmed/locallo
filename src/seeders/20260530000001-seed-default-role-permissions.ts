import type { QueryInterface } from 'sequelize';

const MODULES = ['sellers', 'categories', 'products'] as const;
const ALL_ACTIONS = ['list', 'view', 'add', 'edit', 'delete'] as const;
const OPERATOR_ACTIONS = ['list', 'view'] as const;

function rows(role: string, actions: readonly string[]): object[] {
  const now = new Date();
  return MODULES.flatMap(module =>
    actions.map(action => ({ role, module, action, created_at: now, updated_at: now })),
  );
}

async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.bulkInsert('role_permissions', [
    ...rows('manager', ALL_ACTIONS),
    ...rows('operator', OPERATOR_ACTIONS),
  ]);
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.bulkDelete('role_permissions', {});
}

export { up, down };
