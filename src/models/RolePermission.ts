import {
  Table,
  Column,
  Model,
  PrimaryKey,
  AutoIncrement,
  AllowNull,
  DataType,
  CreatedAt,
  UpdatedAt,
  Unique,
} from 'sequelize-typescript';
import type { PermissionModule, PermissionAction } from '../types';

@Table({ tableName: 'role_permissions', timestamps: true, underscored: true })
export class RolePermission extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  declare id: number;

  @AllowNull(false)
  @Column(DataType.STRING(20))
  declare role: 'manager' | 'operator';

  @AllowNull(false)
  @Column(DataType.STRING(30))
  declare module: PermissionModule;

  @AllowNull(false)
  @Column(DataType.STRING(20))
  declare action: PermissionAction;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;
}
