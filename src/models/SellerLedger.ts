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
import { Expense } from './Expense';

@Table({ tableName: 'seller_ledgers', timestamps: true, underscored: true })
export class SellerLedger extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @AllowNull(false)
  @ForeignKey(() => User)
  @Column(DataType.UUID)
  declare sellerId: string;

  @AllowNull(false)
  @Column(DataType.STRING(255))
  declare name: string;

  @BelongsTo(() => User)
  declare seller: User;

  @HasMany(() => Expense)
  declare expenses: Expense[];

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;
}
