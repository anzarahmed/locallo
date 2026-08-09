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
import { Offer } from './Offer';

@Table({ tableName: 'offer_products', timestamps: false, underscored: true })
export class OfferProduct extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @AllowNull(false)
  @ForeignKey(() => Offer)
  @Column(DataType.INTEGER)
  declare offerId: number;

  @AllowNull(false)
  @ForeignKey(() => User)
  @Column(DataType.UUID)
  declare sellerId: string;

  @AllowNull(false)
  @ForeignKey(() => Product)
  @Column(DataType.UUID)
  declare productId: string;

  @AllowNull(false)
  @Default(DataType.NOW)
  @Column(DataType.DATE)
  declare createdAt: Date;

  @BelongsTo(() => Offer)
  declare offer: Offer;

  @BelongsTo(() => User)
  declare seller: User;

  @BelongsTo(() => Product)
  declare product: Product;
}
