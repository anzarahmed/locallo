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

@Table({ tableName: 'reviews', timestamps: true, underscored: true })
export class Review extends Model {
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
  @Column(DataType.INTEGER)
  declare rating: number;

  @AllowNull(false)
  @Column(DataType.TEXT)
  declare content: string;

  @AllowNull(false)
  @Default([])
  @Column(DataType.JSONB)
  declare images: string[];

  @BelongsTo(() => User)
  declare customer: User;

  @BelongsTo(() => Product)
  declare product: Product;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;
}
