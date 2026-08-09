import { useEffect, useState, type JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Trash2 } from 'lucide-react';
import { getNotifications, markNotificationRead, deleteNotification } from '../../services/notificationService';
import { useToast } from '../../hooks/useToast';
import { ApiError } from '../../lib/axios';
import type { Notification } from '../../types';

const PAGE_LIMIT = 20;

function resolveRoute(notification: Notification): string | null {
  if (notification.referenceType === 'offer' && notification.referenceId) {
    return `/offers/${notification.referenceId}`;
  }
  return null;
}

export default function NotificationList(): JSX.Element {
  const navigate = useNavigate();
  const toast = useToast();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const data = await getNotifications({ page, limit: PAGE_LIMIT });
        setNotifications(data.notifications);
        setTotal(data.total);
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Failed to load notifications');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [page]); // toast is stable

  async function handleClick(notification: Notification): Promise<void> {
    if (!notification.isRead) {
      setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n));
      markNotificationRead(notification.id).catch(() => {});
    }
    const route = resolveRoute(notification);
    if (route) navigate(route);
  }

  async function handleDelete(id: string): Promise<void> {
    setDeletingId(id);
    try {
      await deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      setTotal(t => t - 1);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to delete notification');
    } finally {
      setDeletingId(null);
    }
  }

  const totalPages = Math.ceil(total / PAGE_LIMIT);

  return (
    <div className="min-h-screen bg-gray-50">
      <div
        className="px-6 md:px-8 pt-8 pb-16"
        style={{
          background: 'linear-gradient(150deg, #26B8B2 0%, #1A9E98 45%, #14817C 100%)',
          borderRadius: '0 0 28px 28px',
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <Bell size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-white text-2xl font-bold leading-tight">Notifications</h1>
            {!loading && (
              <p className="text-white/70 text-sm mt-0.5">
                {total} notification{total !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="px-6 md:px-8 -mt-8 relative z-10 pb-8">
        <div className="flex flex-col gap-2 mb-4">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <NotificationSkeleton key={i} />)
          ) : notifications.length === 0 ? (
            <EmptyState />
          ) : (
            notifications.map(n => (
              <NotificationCard
                key={n.id}
                notification={n}
                deleting={deletingId === n.id}
                onClick={() => void handleClick(n)}
                onDelete={(e) => { e.stopPropagation(); void handleDelete(n.id); }}
              />
            ))
          )}
        </div>

        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-white shadow-sm disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              ← Prev
            </button>
            <span className="text-sm text-gray-500 px-3">{page} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-white shadow-sm disabled:opacity-40 hover:bg-gray-50 transition-colors"
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
  deleting: boolean;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
}

function NotificationCard({ notification, deleting, onClick, onDelete }: NotificationCardProps): JSX.Element {
  const clickable = resolveRoute(notification) !== null;

  return (
    <div
      onClick={onClick}
      className={`rounded-2xl shadow-sm p-4 flex items-start gap-3 transition-colors ${
        clickable ? 'cursor-pointer' : ''
      } ${notification.isRead ? 'bg-white' : 'bg-teal-50/60'}`}
    >
      {!notification.isRead && (
        <span className="w-2 h-2 rounded-full bg-teal-500 shrink-0 mt-1.5" />
      )}
      <div className={`flex-1 min-w-0 ${notification.isRead ? 'ml-5' : ''}`}>
        <p className={`text-sm ${notification.isRead ? 'font-medium text-gray-600' : 'font-semibold text-gray-900'}`}>
          {notification.title}
        </p>
        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{notification.message}</p>
      </div>
      <button
        onClick={onDelete}
        disabled={deleting}
        title="Delete notification"
        className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-40 shrink-0"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function NotificationSkeleton(): JSX.Element {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 animate-pulse flex items-start gap-3">
      <div className="flex-1">
        <div className="h-4 bg-gray-100 rounded w-2/3 mb-2" />
        <div className="h-3 bg-gray-100 rounded w-full" />
      </div>
    </div>
  );
}

function EmptyState(): JSX.Element {
  return (
    <div className="bg-white rounded-2xl shadow-sm py-16 text-center">
      <Bell size={40} className="text-gray-200 mx-auto mb-3" />
      <p className="text-sm font-semibold text-gray-500">No notifications yet</p>
      <p className="text-xs text-gray-400 mt-1">Offers and updates will show up here</p>
    </div>
  );
}
