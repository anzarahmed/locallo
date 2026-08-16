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
import { Offer } from './Offer';

export type NotificationChannelStatus = 'pending' | 'sent' | 'failed';

@Table({ tableName: 'offer_seller_notifications', timestamps: true, underscored: true })
export class OfferSellerNotification extends Model {
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
  @Default('pending')
  @Column(DataType.ENUM('pending', 'sent', 'failed'))
  declare emailStatus: NotificationChannelStatus;

  @AllowNull(false)
  @Default(0)
  @Column(DataType.SMALLINT)
  declare emailAttempts: number;

  @Column(DataType.TEXT)
  declare emailLastError: string | null;

  @Column(DataType.DATE)
  declare emailSentAt: Date | null;

  @AllowNull(false)
  @Default('pending')
  @Column(DataType.ENUM('pending', 'sent', 'failed'))
  declare notificationStatus: NotificationChannelStatus;

  @AllowNull(false)
  @Default(0)
  @Column(DataType.SMALLINT)
  declare notificationAttempts: number;

  @Column(DataType.TEXT)
  declare notificationLastError: string | null;

  @Column(DataType.DATE)
  declare notificationSentAt: Date | null;

  @BelongsTo(() => Offer)
  declare offer: Offer;

  @BelongsTo(() => User)
  declare seller: User;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;
}
