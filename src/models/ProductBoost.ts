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
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript';
import { User } from './User';
import { Product } from './Product';
import type { BoostAudienceType, BoostStatus, PaymentStatus } from '../types';

@Table({ tableName: 'product_boosts', timestamps: true, underscored: true })
export class ProductBoost extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @AllowNull(false)
  @ForeignKey(() => User)
  @Column(DataType.UUID)
  declare sellerId: string;

  @AllowNull(false)
  @ForeignKey(() => Product)
  @Column(DataType.UUID)
  declare productId: string;

  @AllowNull(false)
  @Column(DataType.STRING(20))
  declare audienceType: BoostAudienceType;

  @Column(DataType.STRING(100))
  declare state: string | null;

  @Column(DataType.STRING(100))
  declare city: string | null;

  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare dailyBudget: number;

  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare estimatedImpressionsMin: number;

  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare estimatedImpressionsMax: number;

  @AllowNull(false)
  @Default(0)
  @Column(DataType.INTEGER)
  declare impressionCount: number;

  @AllowNull(false)
  @Default('pending')
  @Column(DataType.STRING(20))
  declare status: BoostStatus;

  @AllowNull(false)
  @Column(DataType.STRING(255))
  declare razorpayOrderId: string;

  @AllowNull(false)
  @Default('pending')
  @Column(DataType.STRING(20))
  declare paymentStatus: PaymentStatus;

  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare amount: number;

  @AllowNull(false)
  @Default('INR')
  @Column(DataType.STRING(10))
  declare currency: string;

  @Column(DataType.STRING(255))
  declare razorpayPaymentId: string | null;

  @Column(DataType.STRING(512))
  declare razorpaySignature: string | null;

  @BelongsTo(() => User)
  declare seller: User;

  @BelongsTo(() => Product)
  declare product: Product;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;
}
