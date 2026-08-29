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
import { Product } from './Product';
import { ProductVariant } from './ProductVariant';

@Table({ tableName: 'purchase_logs', timestamps: false, underscored: true })
export class PurchaseLog extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @AllowNull(false)
  @ForeignKey(() => User)
  @Column(DataType.UUID)
  declare sellerId: string;

  @ForeignKey(() => Product)
  @Column(DataType.UUID)
  declare productId: string | null;

  @ForeignKey(() => ProductVariant)
  @Column(DataType.UUID)
  declare variantId: string | null;

  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare quantity: number;

  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare stockBefore: number;

  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare stockAfter: number;

  @AllowNull(false)
  @Column(DataType.STRING(255))
  declare productName: string;

  @Column(DataType.JSONB)
  declare variantInfo: Record<string, unknown> | null;

  @Column(DataType.DECIMAL(12, 2))
  declare costPriceAtPurchase: number | null;

  @AllowNull(false)
  @Default(DataType.NOW)
  @Column(DataType.DATE)
  declare purchasedAt: Date;

  @BelongsTo(() => User)
  declare seller: User;

  @BelongsTo(() => Product)
  declare product: Product;

  @BelongsTo(() => ProductVariant)
  declare variant: ProductVariant;
}
