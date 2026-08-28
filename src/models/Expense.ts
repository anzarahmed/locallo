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
import { SellerLedger } from './SellerLedger';

@Table({ tableName: 'expenses', timestamps: true, underscored: true })
export class Expense extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @AllowNull(false)
  @ForeignKey(() => User)
  @Column(DataType.UUID)
  declare sellerId: string;

  @AllowNull(false)
  @ForeignKey(() => SellerLedger)
  @Column(DataType.UUID)
  declare ledgerId: string;

  @AllowNull(false)
  @Column(DataType.DECIMAL(12, 2))
  declare amount: number;

  @Column(DataType.STRING(255))
  declare description: string | null;

  @AllowNull(false)
  @Column(DataType.DATEONLY)
  declare expenseDate: string;

  @BelongsTo(() => User)
  declare seller: User;

  @BelongsTo(() => SellerLedger)
  declare ledger: SellerLedger;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;
}
