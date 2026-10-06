import { useEffect, useState, type JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BadgePercent } from 'lucide-react';
import { getNotifications } from '../../services/notificationService';
import { useToast } from '../../hooks/useToast';
import { ApiError } from '../../lib/axios';
import { formatRelativeTime } from '../../lib/formatters';
import { NOTIFICATION_FILTER_TABS } from '../../constants';
import type { OfferNavState } from '../../lib/offerUtils';
import type { Notification, NotificationFilter } from '../../types';

const PAGE_LIMIT = 20;

function resolveRoute(notification: Notification): string | null {
  if (notification.referenceType === 'offer' && notification.referenceId) {
    return `/offers/${notification.referenceId}`;
  }
  return null;
}

function typeIcon(type: string): JSX.Element {
  if (type === 'offer') return <BadgePercent size={18} className="text-teal-600" />;
  return <Bell size={18} className="text-teal-600" />;
}

export default function NotificationList(): JSX.Element {
  const navigate = useNavigate();
  const toast = useToast();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const data = await getNotifications({ page, limit: PAGE_LIMIT, filter });
        setNotifications(data.notifications);
        setTotal(data.total);
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Failed to load notifications');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [page, filter]); // toast is stable

  function handleFilterChange(next: NotificationFilter): void {
    setFilter(next);
    setPage(1);
  }

  function handleClick(notification: Notification): void {
    const route = resolveRoute(notification);
    if (route) navigate(route, { state: { from: '/notifications' } satisfies OfferNavState });
  }

  const totalPages = Math.ceil(total / PAGE_LIMIT);

  return (
    <div className="min-h-screen bg-gray-50">
      <div
        className="px-6 md:px-8 pt-8 pb-8"
        style={{
          background: 'linear-gradient(150deg, #26B8B2 0%, #1A9E98 45%, #14817C 100%)',
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <Bell size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-white text-2xl font-bold leading-tight">Notifications</h1>
            <p className="text-white/70 text-sm mt-0.5">
              {loading ? 'Loading…' : `${total} notification${total !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 md:px-8 pt-5 pb-8 max-w-2xl mx-auto">
        <div className="flex gap-2 mb-4">
          {NOTIFICATION_FILTER_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => handleFilterChange(tab.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                filter === tab.value
                  ? 'bg-teal-600 text-white'
                  : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 mb-4">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <NotificationSkeleton key={i} />)
          ) : notifications.length === 0 ? (
            <EmptyState filter={filter} />
          ) : (
            notifications.map(n => (
              <NotificationCard
                key={n.id}
                notification={n}
                onClick={() => handleClick(n)}
              />
            ))
          )}
        </div>

        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-white border border-gray-100 shadow-sm disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              ← Prev
            </button>
            <span className="text-sm text-gray-500 px-3">{page} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-white border border-gray-100 shadow-sm disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface NotificationCardProps {
  notification: Notification;
  onClick: () => void;
}

function NotificationCard({ notification, onClick }: NotificationCardProps): JSX.Element {
  const clickable = resolveRoute(notification) !== null;

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl shadow-sm border p-4 flex items-start gap-3 transition-all ${
        clickable ? 'cursor-pointer hover:shadow-md hover:border-teal-100' : ''
      } ${notification.isRead ? 'border-gray-100' : 'border-teal-100'}`}
    >
      <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center shrink-0">
        {typeIcon(notification.type)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`text-sm truncate ${notification.isRead ? 'font-medium text-gray-700' : 'font-semibold text-gray-900'}`}>
            {notification.title}
          </p>
          {!notification.isRead && <span className="w-2 h-2 rounded-full bg-teal-500 shrink-0" />}
        </div>
        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{notification.message}</p>
        <p className="text-[11px] text-gray-400 mt-1.5">{formatRelativeTime(notification.createdAt)}</p>
      </div>
    </div>
  );
}

function NotificationSkeleton(): JSX.Element {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 animate-pulse flex items-start gap-3">
      <div className="w-10 h-10 rounded-full bg-gray-100 shrink-0" />
      <div className="flex-1">
        <div className="h-4 bg-gray-100 rounded w-2/3 mb-2" />
        <div className="h-3 bg-gray-100 rounded w-full mb-2" />
        <div className="h-2.5 bg-gray-100 rounded w-16" />
      </div>
    </div>
  );
}

interface EmptyStateProps {
  filter: NotificationFilter;
}

function EmptyState({ filter }: EmptyStateProps): JSX.Element {
  const message = filter === 'offers'
    ? 'No offer notifications yet'
    : filter === 'other'
      ? 'No other notifications yet'
      : 'No notifications yet';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-3">
        <Bell size={26} className="text-teal-300" />
      </div>
      <p className="text-sm font-semibold text-gray-600">{message}</p>
      <p className="text-xs text-gray-400 mt-1">Offers and updates will show up here</p>
    </div>
  );
}
