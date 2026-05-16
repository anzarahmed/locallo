import {
  Table,
  Column,
  Model,
  PrimaryKey,
  Default,
  AllowNull,
  DataType,
  CreatedAt,
} from 'sequelize-typescript';
import type { ActorType } from '../types';

@Table({ tableName: 'audit_logs', timestamps: true, updatedAt: false, underscored: true })
export class AuditLog extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  declare actorType: ActorType;

  @AllowNull(false)
  @Column(DataType.UUID)
  declare actorId: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  declare action: string;

  @Column(DataType.TEXT)
  declare targetTable: string | null;

  @Column(DataType.UUID)
  declare targetId: string | null;

  @Default({})
  @AllowNull(false)
  @Column(DataType.JSONB)
  declare metadata: Record<string, unknown>;

  @CreatedAt
  declare createdAt: Date;
}
