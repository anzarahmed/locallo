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

@Table({ tableName: 'sessions', timestamps: true, updatedAt: false, underscored: true })
export class Session extends Model {
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
  declare tokenHash: string;

  @Column(DataType.TEXT)
  declare deviceId: string | null;

  @Column(DataType.TEXT)
  declare deviceType: string | null;

  @Column(DataType.DATE)
  declare expiresAt: Date | null;

  @CreatedAt
  declare createdAt: Date;
}
