import { type JSX } from 'react';
import { Users, ShoppingBag, TrendingUp, DollarSign, type LucideIcon } from 'lucide-react';

interface StatCard {
  label: string;
  value: string;
  change: string;
  icon: LucideIcon;
  color: string;
}

interface ActivityItem {
  msg: string;
  time: string;
  color: string;
}

const STATS: StatCard[] = [
  { label: 'Total Sellers',   value: '1,284',  change: '+12%', icon: Users,       color: 'bg-indigo-50 text-indigo-600' },
  { label: 'Active Listings', value: '24,530', change: '+8%',  icon: ShoppingBag, color: 'bg-emerald-50 text-emerald-600' },
  { label: 'Monthly Revenue', value: '₹4.2L',  change: '+23%', icon: DollarSign,  color: 'bg-amber-50 text-amber-600' },
  { label: 'Growth Rate',     value: '18.4%',  change: '+3%',  icon: TrendingUp,  color: 'bg-rose-50 text-rose-600' },
];

const ACTIVITIES: ActivityItem[] = [
  { msg: 'New seller registered: Urban Eats',       time: '2 min ago',  color: 'bg-indigo-500' },
  { msg: 'Seller profile updated: Spice Garden',    time: '15 min ago', color: 'bg-emerald-500' },
  { msg: 'Seller deactivated: Old Craft Store',     time: '1 hr ago',   color: 'bg-amber-500' },
  { msg: 'New seller registered: Tech Hub',         time: '3 hr ago',   color: 'bg-indigo-500' },
];

export default function Dashboard(): JSX.Element {
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {STATS.map(({ label, value, change, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
            <div className={`p-3 rounded-xl ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
              <p className="text-xs text-emerald-600 font-medium mt-1">{change} this month</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="space-y-3">
          {ACTIVITIES.map((item, i) => (
            <div key={i} className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0">
              <div className={`w-2 h-2 rounded-full shrink-0 ${item.color}`} />
              <p className="text-sm text-gray-700 flex-1">{item.msg}</p>
              <span className="text-xs text-gray-400 shrink-0">{item.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
