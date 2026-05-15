import type { Seller } from '../../types';

export const MOCK_SELLERS: Seller[] = [
  { id: 1, name: 'Ravi Kumar', email: 'ravi@urbanfood.com', phone: '+91 98765 43210', businessName: 'Urban Eats', status: 'active', createdAt: '2025-01-15' },
  { id: 2, name: 'Priya Sharma', email: 'priya@spicegarden.in', phone: '+91 87654 32109', businessName: 'Spice Garden', status: 'active', createdAt: '2025-02-03' },
  { id: 3, name: 'Anil Verma', email: 'anil@techzone.com', phone: '+91 76543 21098', businessName: 'Tech Hub', status: 'inactive', createdAt: '2025-02-20' },
  { id: 4, name: 'Meena Nair', email: 'meena@crafts.in', phone: '+91 65432 10987', businessName: 'Old Craft Store', status: 'pending', createdAt: '2025-03-10' },
  { id: 5, name: 'Suresh Patel', email: 'suresh@freshbox.com', phone: '+91 54321 09876', businessName: 'Fresh Box', status: 'active', createdAt: '2025-03-22' },
];
