import {
  Table,
  Column,
  Model,
  PrimaryKey,
  AutoIncrement,
  Unique,
  AllowNull,
  Default,
  DataType,
  HasMany,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript';
import type { AttributeField } from '../types';
import { SellerProfile } from './SellerProfile';

@Table({ tableName: 'categories', timestamps: true, underscored: true })
export class Category extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  declare id: number;

  @Unique
  @AllowNull(false)
  @Column(DataType.STRING(100))
  declare name: string;

  @Unique
  @AllowNull(false)
  @Column(DataType.STRING(100))
  declare slug: string;

  @Default(true)
  @AllowNull(false)
  @Column(DataType.BOOLEAN)
  declare isActive: boolean;

  @Column(DataType.JSONB)
  declare attributeSchema: AttributeField[] | null;

  @HasMany(() => SellerProfile)
  declare sellerProfiles: SellerProfile[];

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;
}
