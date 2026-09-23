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
import type { CmsAudience } from '../types';

@Table({ tableName: 'cms_pages', timestamps: true, underscored: true })
export class CmsPage extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  declare id: number;

  @AllowNull(false)
  @Column(DataType.TEXT)
  declare title: string;

  @AllowNull(false)
  @Column(DataType.STRING(150))
  declare slug: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  declare content: string;

  @Default('customer')
  @AllowNull(false)
  @Column(DataType.ENUM('customer', 'seller'))
  declare audience: CmsAudience;

  @Default(true)
  @AllowNull(false)
  @Column(DataType.BOOLEAN)
  declare isActive: boolean;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;
}
