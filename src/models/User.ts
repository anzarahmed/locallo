import {
  Table,
  Column,
  Model,
  PrimaryKey,
  Default,
  Unique,
  AllowNull,
  DataType,
  HasOne,
  HasMany,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript';
import type { UserRole } from '../types';
import { SellerProfile } from './SellerProfile';
import { Product } from './Product';

@Table({ tableName: 'users', timestamps: true, underscored: true })
export class User extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @Unique('users_mobile_role_key')
  @AllowNull(false)
  @Column(DataType.TEXT)
  declare mobile: string;

  @Column(DataType.TEXT)
  declare countryCode: string | null;

  @Unique('users_mobile_role_key')
  @AllowNull(false)
  @Column(DataType.ENUM('CUSTOMER', 'SELLER'))
  declare role: UserRole;

  @Column(DataType.TEXT)
  declare fullName: string | null;

  @Column(DataType.TEXT)
  declare otpCode: string | null;

  @Column(DataType.DATE)
  declare otpExpiresAt: Date | null;

  @Default(false)
  @AllowNull(false)
  @Column(DataType.BOOLEAN)
  declare isVerified: boolean;

  @Default(true)
  @AllowNull(false)
  @Column(DataType.BOOLEAN)
  declare isActive: boolean;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;

  @HasOne(() => SellerProfile, 'userId')
  declare sellerProfile: SellerProfile | null;

  @HasMany(() => Product, 'sellerId')
  declare products: Product[];
}
