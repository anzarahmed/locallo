import {
  Table,
  Column,
  Model,
  PrimaryKey,
  AutoIncrement,
  AllowNull,
  Default,
  DataType,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript';
import type { AppPlatform, AppType } from '../types';

@Table({ tableName: 'app_configs', timestamps: true, underscored: true })
export class AppConfig extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  declare id: number;

  @AllowNull(false)
  @Column(DataType.STRING(20))
  declare app: AppType;

  @AllowNull(false)
  @Column(DataType.STRING(20))
  declare platform: AppPlatform;

  @Default(1)
  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare versionCode: number;

  @Default(false)
  @AllowNull(false)
  @Column(DataType.BOOLEAN)
  declare isForceUpdate: boolean;

  @Default(false)
  @AllowNull(false)
  @Column(DataType.BOOLEAN)
  declare isAppMaintenance: boolean;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;
}
