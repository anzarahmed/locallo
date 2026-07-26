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
import { Brand } from './Brand';
import { Admin } from './Admin';

@Table({ tableName: 'banners', timestamps: true, underscored: true })
export class Banner extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  declare id: number;

  @ForeignKey(() => Brand)
  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare brandId: number;

  @BelongsTo(() => Brand)
  declare brand: Brand;

  @AllowNull(false)
  @Column(DataType.STRING(500))
  declare image: string;

  @Column(DataType.STRING(150))
  declare title: string | null;

  @AllowNull(false)
  @Column(DataType.DATEONLY)
  declare startDate: string;

  @AllowNull(false)
  @Column(DataType.DATEONLY)
  declare endDate: string;

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
