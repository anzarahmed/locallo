import type { Seller } from '../../types';

export const MOCK_SELLERS: Seller[] = [
  { id: 1, ownerName: 'Ravi Kumar',   shopName: 'Urban Eats',       email: 'ravi@urbanfood.com',   mobile: '+919876543210', category: 'Restaurant & Food', bio: 'Fresh homestyle food delivered fast.',  status: 'active',   createdAt: '2025-01-15' },
  { id: 2, ownerName: 'Priya Sharma', shopName: 'Spice Garden',     email: 'priya@spicegarden.in', mobile: '+918765432109', category: 'Restaurant & Food', bio: 'Authentic South Indian cuisine.',        status: 'active',   createdAt: '2025-02-03' },
  { id: 3, ownerName: 'Anil Verma',   shopName: 'Tech Hub',         email: 'anil@techzone.com',    mobile: '+917654321098', category: 'Electronics',       bio: 'Latest gadgets at the best prices.',    status: 'inactive', createdAt: '2025-02-20' },
  { id: 4, ownerName: 'Meena Nair',   shopName: 'Old Craft Store',  email: 'meena@crafts.in',      mobile: '+916543210987', category: 'Other',             bio: 'Handmade crafts and gifts.',            status: 'pending',  createdAt: '2025-03-10' },
  { id: 5, ownerName: 'Suresh Patel', shopName: 'Fresh Box',        email: 'suresh@freshbox.com',  mobile: '+915432109876', category: 'Grocery',           bio: 'Daily essentials, delivered by 9 AM.',  status: 'active',   createdAt: '2025-03-22' },
];
