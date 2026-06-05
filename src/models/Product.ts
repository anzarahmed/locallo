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
  HasMany,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript';
import { User } from './User';
import { Category } from './Category';
import { ProductVariant } from './ProductVariant';

@Table({ tableName: 'products', timestamps: true, underscored: true })
export class Product extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @AllowNull(false)
  @ForeignKey(() => User)
  @Column(DataType.UUID)
  declare sellerId: string;

  @AllowNull(false)
  @ForeignKey(() => Category)
  @Column(DataType.INTEGER)
  declare categoryId: number;

  @AllowNull(false)
  @Column(DataType.STRING(255))
  declare name: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  declare description: string;

  @AllowNull(false)
  @Column(DataType.DECIMAL(10, 2))
  declare sellingPrice: number;

  @Column(DataType.DECIMAL(10, 2))
  declare mrp: number | null;

  @Column(DataType.DECIMAL(10, 2))
  declare costPrice: number | null;

  @AllowNull(false)
  @Default(0)
  @Column(DataType.INTEGER)
  declare stock: number;

  @AllowNull(false)
  @Default([])
  @Column(DataType.JSONB)
  declare images: string[];

  @AllowNull(false)
  @Default({})
  @Column(DataType.JSONB)
  declare attributes: Record<string, unknown>;

  @Column(DataType.TEXT)
  declare pickupAddress: string | null;

  @Column(DataType.DECIMAL(10, 7))
  declare pickupLat: number | null;

  @Column(DataType.DECIMAL(10, 7))
  declare pickupLong: number | null;

  @AllowNull(false)
  @Default(true)
  @Column(DataType.BOOLEAN)
  declare isActive: boolean;

  @BelongsTo(() => User)
  declare seller: User;

  @BelongsTo(() => Category)
  declare category: Category;

  @HasMany(() => ProductVariant)
  declare variants: ProductVariant[];

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;
}
