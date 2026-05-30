import type { QueryInterface, DataTypes as DataTypesType } from 'sequelize';

async function up(queryInterface: QueryInterface, DataTypes: typeof DataTypesType): Promise<void> {
  await queryInterface.createTable('role_permissions', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    role: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    module: {
      type: DataTypes.STRING(30),
      allowNull: false,
    },
    action: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  });

  await queryInterface.addConstraint('role_permissions', {
    fields: ['role', 'module', 'action'],
    type: 'unique',
    name: 'role_permissions_role_module_action_unique',
  });

  await queryInterface.addIndex('role_permissions', ['role'], {
    name: 'role_permissions_role_idx',
  });
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('role_permissions');
}

export { up, down };
