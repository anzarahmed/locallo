import { Op, literal } from 'sequelize';
import { User } from '../../models/User';
import { Wishlist } from '../../models/Wishlist';
import { Product } from '../../models/Product';

const VALID_CUSTOMER_SORT = new Set(['fullName', 'mobile', 'createdAt', 'isVerified', 'isActive']);
const WISHLIST_LIST_LIMIT = 20;

interface ListCustomersFilter {
  search?: string;
  isVerified?: boolean;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export async function listCustomers(
  filters: ListCustomersFilter,
  page: number,
  limit: number,
): Promise<{ rows: User[]; count: number }> {
  const where: Record<string | symbol, unknown> = { role: 'CUSTOMER' };

  if (filters.isVerified !== undefined) where.isVerified = filters.isVerified;
  if (filters.isActive !== undefined)   where.isActive   = filters.isActive;
  if (filters.search) {
    where[Op.or] = [
      { fullName: { [Op.iLike]: `%${filters.search}%` } },
      { mobile:   { [Op.iLike]: `%${filters.search}%` } },
    ];
  }

  const sortField = VALID_CUSTOMER_SORT.has(filters.sortBy ?? '') ? (filters.sortBy as string) : 'createdAt';
  const sortOrder = filters.sortOrder ?? 'DESC';

  return User.findAndCountAll({
    where,
    attributes: {
      include: [
        [
          literal('(SELECT COUNT(*)::int FROM wishlists WHERE customer_id = "User".id)'),
          'wishlistCount',
        ],
      ],
    },
    order: [[sortField, sortOrder]],
    limit,
    offset: (page - 1) * limit,
  });
}

export async function getCustomerById(id: string): Promise<{ customer: User; wishlist: Wishlist[]; wishlistTotal: number }> {
  const customer = await User.findOne({ where: { id, role: 'CUSTOMER' } });
  if (!customer) {
    throw Object.assign(new Error('Customer not found'), { status: 404 });
  }

  const { rows: wishlist, count: wishlistTotal } = await Wishlist.findAndCountAll({
    where: { customerId: id },
    include: [{ model: Product, attributes: ['id', 'name', 'images', 'sellingPrice', 'mrp', 'isActive'] }],
    order: [['createdAt', 'DESC']],
    limit: WISHLIST_LIST_LIMIT,
  });

  return { customer, wishlist, wishlistTotal };
}

export async function toggleCustomerStatus(id: string): Promise<User> {
  const customer = await User.findOne({ where: { id, role: 'CUSTOMER' } });
  if (!customer) {
    throw Object.assign(new Error('Customer not found'), { status: 404 });
  }
  await customer.update({ isActive: !customer.isActive });
  return customer;
}
