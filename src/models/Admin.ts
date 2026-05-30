import {
  Table,
  Column,
  Model,
  PrimaryKey,
  Default,
  Unique,
  AllowNull,
  DataType,
  ForeignKey,
  BelongsTo,
  HasMany,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript';
import type { AdminRole } from '../types';

@Table({ tableName: 'admins', timestamps: true, underscored: true })
export class Admin extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @Unique
  @AllowNull(false)
  @Column(DataType.TEXT)
  declare email: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  declare passwordHash: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  declare role: AdminRole;

  @AllowNull(true)
  @Column(DataType.TEXT)
  declare fullName: string | null;

  @ForeignKey(() => Admin)
  @Column(DataType.UUID)
  declare managedBy: string | null;

  @BelongsTo(() => Admin, 'managedBy')
  declare manager: Admin | null;

  @HasMany(() => Admin, 'managedBy')
  declare subordinates: Admin[];

  @Default(true)
  @AllowNull(false)
  @Column(DataType.BOOLEAN)
  declare isActive: boolean;

  @AllowNull(true)
  @Column(DataType.TEXT)
  declare resetToken: string | null;

  @AllowNull(true)
  @Column(DataType.DATE)
  declare resetTokenExpiresAt: Date | null;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;
}
