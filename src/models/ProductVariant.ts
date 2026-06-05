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
import { Product } from './Product';

@Table({ tableName: 'product_variants', timestamps: true, underscored: true })
export class ProductVariant extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @AllowNull(false)
  @ForeignKey(() => Product)
  @Column(DataType.UUID)
  declare productId: string;

  @AllowNull(false)
  @Default({})
  @Column(DataType.JSONB)
  declare attributes: Record<string, unknown>;

  @AllowNull(false)
  @Default([])
  @Column(DataType.JSONB)
  declare images: string[];

  @AllowNull(false)
  @Default(0)
  @Column(DataType.INTEGER)
  declare stock: number;

  @Column(DataType.DECIMAL(10, 2))
  declare sellingPrice: number | null;

  @Column(DataType.DECIMAL(10, 2))
  declare mrp: number | null;

  @AllowNull(false)
  @Default(true)
  @Column(DataType.BOOLEAN)
  declare isActive: boolean;

  @BelongsTo(() => Product)
  declare product: Product;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;
}
