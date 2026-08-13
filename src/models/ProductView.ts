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

@Table({ tableName: 'product_views', timestamps: false, underscored: true })
export class ProductView extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @AllowNull(false)
  @ForeignKey(() => User)
  @Column(DataType.UUID)
  declare customerId: string;

  @AllowNull(false)
  @ForeignKey(() => Product)
  @Column(DataType.UUID)
  declare productId: string;

  @AllowNull(false)
  @ForeignKey(() => User)
  @Column(DataType.UUID)
  declare sellerId: string;

  @AllowNull(false)
  @Default(DataType.NOW)
  @Column(DataType.DATE)
  declare viewedAt: Date;

  @BelongsTo(() => User, 'customerId')
  declare customer: User;

  @BelongsTo(() => Product)
  declare product: Product;

  @BelongsTo(() => User, 'sellerId')
  declare seller: User;
}
