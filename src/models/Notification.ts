import {
  Table,
  Column,
  Model,
  PrimaryKey,
  AllowNull,
  Default,
  DataType,
  ForeignKey,
  BelongsTo,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript';
import { User } from './User';
import type { PushOptions, PushStatus } from '../types';

@Table({ tableName: 'notifications', timestamps: true, underscored: true })
export class Notification extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  // Holds seller ids too; the column was renamed to user_id, the attribute kept to limit churn.
  @AllowNull(false)
  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, field: 'user_id' })
  declare customerId: string;

  @BelongsTo(() => User)
  declare customer: User;

  @AllowNull(false)
  @Column(DataType.STRING(150))
  declare title: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  declare message: string;

  @AllowNull(false)
  @Default('general')
  @Column(DataType.STRING(50))
  declare type: string;

  @Column(DataType.STRING(30))
  declare referenceType: string | null;

  @Column(DataType.STRING(64))
  declare referenceId: string | null;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  declare isRead: boolean;

  @Column(DataType.TEXT)
  declare dedupeKey: string | null;

  @Column(DataType.JSONB)
  declare data: Record<string, string> | null;

  @Column(DataType.JSONB)
  declare pushOptions: PushOptions | null;

  @AllowNull(false)
  @Default('skipped')
  @Column(DataType.ENUM('skipped', 'pending', 'sent', 'failed'))
  declare pushStatus: PushStatus;

  @AllowNull(false)
  @Default(0)
  @Column(DataType.SMALLINT)
  declare pushAttempts: number;

  @Column(DataType.TEXT)
  declare pushLastError: string | null;

  @Column(DataType.DATE)
  declare pushSentAt: Date | null;

  @Column(DataType.DATE)
  declare sendAfter: Date | null;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;
}
