import {
  Table,
  Column,
  Model,
  PrimaryKey,
  Default,
  Unique,
  AllowNull,
  DataType,
  ForeignKey,
  BelongsTo,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript';
import { Admin } from './Admin';
import { User } from './User';
import type { NotificationSettings, KycDocuments } from '../types';

@Table({ tableName: 'seller_profiles', timestamps: true, underscored: true })
export class SellerProfile extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @Unique
  @AllowNull(false)
  @ForeignKey(() => User)
  @Column(DataType.UUID)
  declare userId: string;

  @BelongsTo(() => User, 'userId')
  declare user: User;

  @AllowNull(false)
  @ForeignKey(() => Admin)
  @Column(DataType.UUID)
  declare createdBy: string;

  @BelongsTo(() => Admin, 'createdBy')
  declare creator: Admin;

  @AllowNull(false)
  @Column(DataType.TEXT)
  declare businessName: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  declare email: string;

  @AllowNull(false)
  @Column(DataType.DECIMAL(9, 6))
  declare lat: number;

  @AllowNull(false)
  @Column(DataType.DECIMAL(9, 6))
  declare long: number;

  @Column(DataType.TEXT)
  declare address: string | null;

  @Column(DataType.TEXT)
  declare city: string | null;

  @Column(DataType.TEXT)
  declare state: string | null;

  @Column(DataType.TEXT)
  declare pincode: string | null;

  @Default(false)
  @AllowNull(false)
  @Column(DataType.BOOLEAN)
  declare isVerified: boolean;

  @ForeignKey(() => Admin)
  @Column(DataType.UUID)
  declare verifiedBy: string | null;

  @BelongsTo(() => Admin, 'verifiedBy')
  declare verifier: Admin | null;

  @Default([])
  @AllowNull(false)
  @Column(DataType.JSONB)
  declare categoryIds: number[];

  @Default([])
  @AllowNull(false)
  @Column(DataType.JSONB)
  declare brandIds: number[];

  @Column(DataType.TEXT)
  declare bio: string | null;

  @Default({})
  @AllowNull(false)
  @Column(DataType.JSONB)
  declare workingHours: Record<string, unknown>;

  @Default({
    pushNotifications: false,
    emailUpdates: false,
    smsAlerts: false,
    offersAndPromotions: false,
    wishlistPriceDrops: false,
    sellerUpdates: false,
  })
  @AllowNull(false)
  @Column(DataType.JSONB)
  declare notificationSettings: NotificationSettings;

  @Column(DataType.JSONB)
  declare customDayOverride: { date: string; time: { open: string; close: string; isClosed: boolean } } | null;

  @Column(DataType.DATE)
  declare verifiedAt: Date | null;

  @Default({ aadhar: null, pan: null, registrationCertificate: null, other: null })
  @AllowNull(false)
  @Column(DataType.JSONB)
  declare kycDocuments: KycDocuments;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;
}
