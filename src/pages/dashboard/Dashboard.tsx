import { useEffect, useState, type JSX } from 'react';
import { Users, ShoppingBag, TrendingUp, DollarSign, type LucideIcon } from 'lucide-react';
import { getRecentActivity } from '../../services/dashboardService';
import type { ActivityItem, ActivityType } from '../../services/dashboardService';

interface StatCard {
  label: string;
  value: string;
  change: string;
  icon: LucideIcon;
  color: string;
}

const STATS: StatCard[] = [
  { label: 'Total Sellers',   value: '1,284',  change: '+12%', icon: Users,       color: 'bg-indigo-50 text-indigo-600' },
  { label: 'Active Listings', value: '24,530', change: '+8%',  icon: ShoppingBag, color: 'bg-emerald-50 text-emerald-600' },
  { label: 'Monthly Revenue', value: '₹4.2L',  change: '+23%', icon: DollarSign,  color: 'bg-amber-50 text-amber-600' },
  { label: 'Growth Rate',     value: '18.4%',  change: '+3%',  icon: TrendingUp,  color: 'bg-rose-50 text-rose-600' },
];

const ACTIVITY_COLORS: Record<ActivityType, string> = {
  seller_added:    'bg-indigo-500',
  seller_verified: 'bg-emerald-500',
  product_added:   'bg-blue-500',
  category_added:  'bg-purple-500',
  subadmin_added:  'bg-amber-500',
};

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function Dashboard(): JSX.Element {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getRecentActivity()
      .then((res) => {
        if (!cancelled) setActivities(res.activities);
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load recent activity');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0">
                <div className="w-2 h-2 rounded-full shrink-0 bg-gray-200 animate-pulse" />
                <div className="h-3.5 flex-1 rounded bg-gray-200 animate-pulse" />
                <div className="h-3 w-16 rounded bg-gray-200 animate-pulse shrink-0" />
              </div>
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-gray-500">{error}</p>
        ) : activities.length === 0 ? (
          <p className="text-sm text-gray-500">No recent activity</p>
        ) : (
          <div className="space-y-3">
            {activities.map((item) => (
              <div key={item.id} className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0">
                <div className={`w-2 h-2 rounded-full shrink-0 ${ACTIVITY_COLORS[item.type]}`} />
                <p className="text-sm text-gray-700 flex-1">{item.message}</p>
                <span className="text-xs text-gray-400 shrink-0">{formatRelativeTime(item.timestamp)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
