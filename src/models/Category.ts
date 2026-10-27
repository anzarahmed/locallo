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
  CreatedAt,
  UpdatedAt,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import type { AttributeField } from '../types';
import { MasterCategory } from './MasterCategory';

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

  @Column(DataType.STRING(500))
  declare icon: string | null;

  // Per seller: each product without variants, or each variant group, uses one unit of
  // the seller's allowance in this category.
  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare productLimit: number;

  @ForeignKey(() => MasterCategory)
  @Column(DataType.INTEGER)
  declare masterCategoryId: number | null;

  @BelongsTo(() => MasterCategory)
  declare masterCategory: MasterCategory;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;
}
