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
} from 'sequelize-typescript';
import { User } from './User';
import { Category } from './Category';
import { Product } from './Product';

export type ProductLimitReason = 'product' | 'variant_group' | 'initial_balance';

@Table({ tableName: 'product_limit_logs', timestamps: false, underscored: true })
export class ProductLimitLog extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @AllowNull(false)
  @ForeignKey(() => User)
  @Column(DataType.UUID)
  declare sellerId: string;

  @ForeignKey(() => Category)
  @Column(DataType.INTEGER)
  declare categoryId: number | null;

  @BelongsTo(() => Category)
  declare category: Category;

  @AllowNull(false)
  @Column(DataType.STRING(100))
  declare categoryName: string;

  @ForeignKey(() => Product)
  @Column(DataType.UUID)
  declare productId: string | null;

  @AllowNull(false)
  @Column(DataType.STRING(255))
  declare productName: string;

  @Column(DataType.STRING(255))
  declare groupLabel: string | null;

  @AllowNull(false)
  @Column(DataType.ENUM('product', 'variant_group', 'initial_balance'))
  declare reason: ProductLimitReason;

  @AllowNull(false)
  @Default(1)
  @Column(DataType.INTEGER)
  declare units: number;

  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare usedAfter: number;

  @Column(DataType.INTEGER)
  declare limitAtTime: number | null;

  @Column(DataType.INTEGER)
  declare remainingAfter: number | null;

  @AllowNull(false)
  @Default(DataType.NOW)
  @Column(DataType.DATE)
  declare createdAt: Date;
}
