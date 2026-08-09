import {
  Table,
  Column,
  Model,
  PrimaryKey,
  AutoIncrement,
  AllowNull,
  Default,
  ForeignKey,
  BelongsTo,
  DataType,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript';
import { Admin } from './Admin';
import type { OfferConfig, OfferType } from '../types';

@Table({ tableName: 'offers', timestamps: true, underscored: true })
export class Offer extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  declare id: number;

  @AllowNull(false)
  @Column(DataType.STRING(150))
  declare title: string;

  @Column(DataType.TEXT)
  declare description: string | null;

  @AllowNull(false)
  @Column(DataType.DATE)
  declare startDate: Date;

  @AllowNull(false)
  @Column(DataType.DATE)
  declare endDate: Date;

  @AllowNull(false)
  @Column(DataType.ENUM('percentage_off', 'flat_amount_off', 'bogo'))
  declare offerType: OfferType;

  @AllowNull(false)
  @Column(DataType.JSONB)
  declare config: OfferConfig;

  @Default(true)
  @AllowNull(false)
  @Column(DataType.BOOLEAN)
  declare isActive: boolean;

  @ForeignKey(() => Admin)
  @Column(DataType.UUID)
  declare createdBy: string | null;

  @BelongsTo(() => Admin)
  declare creator: Admin;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;
}
