import { useEffect, useState, type JSX } from 'react';
import { Store, Users, ShoppingBag, DollarSign, type LucideIcon } from 'lucide-react';
import { getRecentActivity, getDashboardStats } from '../../services/dashboardService';
import type { ActivityItem, ActivityType, DashboardStats } from '../../services/dashboardService';
import { formatDate } from '../../lib/dateFormat';

interface StatCardConfig {
  key: keyof DashboardStats;
  label: string;
  icon: LucideIcon;
  color: string;
  format: (value: number) => string;
}

function formatCount(value: number): string {
  return value.toLocaleString('en-IN');
}

function formatCurrency(value: number): string {
  return `₹${value.toLocaleString('en-IN')}`;
}

const STAT_CARDS: StatCardConfig[] = [
  { key: 'totalActiveSellers',    label: 'Total Active Sellers',      icon: Store,       color: 'bg-indigo-50 text-indigo-600',  format: formatCount },
  { key: 'totalCustomers',        label: 'Total Customers',           icon: Users,       color: 'bg-emerald-50 text-emerald-600', format: formatCount },
  { key: 'totalActiveProducts',   label: 'Total Active Products',     icon: ShoppingBag, color: 'bg-amber-50 text-amber-600',    format: formatCount },
  { key: 'totalPaymentsThisMonth', label: 'Total Payment (This Month)', icon: DollarSign,  color: 'bg-rose-50 text-rose-600',      format: formatCurrency },
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
  return formatDate(iso);
}

export default function Dashboard(): JSX.Element {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

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

  useEffect(() => {
    let cancelled = false;
    setStatsLoading(true);
    getDashboardStats()
      .then((res) => {
        if (!cancelled) setStats(res);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setStatsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {STAT_CARDS.map(({ key, label, icon: Icon, color, format }) => (
          <div key={key} className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
            <div className={`p-3 rounded-xl ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{label}</p>
              {statsLoading || !stats ? (
                <div className="h-7 w-20 rounded bg-gray-200 animate-pulse mt-1" />
              ) : (
                <p className="text-2xl font-bold text-gray-900 mt-0.5">{format(stats[key])}</p>
              )}
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
