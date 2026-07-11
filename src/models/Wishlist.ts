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

@Table({ tableName: 'wishlists', timestamps: false, underscored: true })
export class Wishlist extends Model {
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
  @Default(DataType.NOW)
  @Column(DataType.DATE)
  declare createdAt: Date;

  @BelongsTo(() => User)
  declare customer: User;

  @BelongsTo(() => Product)
  declare product: Product;
}
