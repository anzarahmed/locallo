import { useEffect, useState, type JSX } from 'react';
import { PackagePlus, Boxes } from 'lucide-react';
import { getPurchaseLogs } from '../../services/sellerService';
import { useToast } from '../../hooks/useToast';
import { ApiError } from '../../lib/axios';
import type { PurchaseLog } from '../../types';

const PAGE_LIMIT = 20;

type DateFilter = 'today' | 'week' | 'month' | 'all';

interface DateFilterTab {
  value: DateFilter;
  label: string;
}

const DATE_FILTERS: DateFilterTab[] = [
  { value: 'all',   label: 'All'        },
  { value: 'today', label: 'Today'      },
  { value: 'week',  label: 'This Week'  },
  { value: 'month', label: 'This Month' },
];

function getDateRange(filter: DateFilter): { from?: string; to?: string } {
  if (filter === 'all') return {};
  const now   = new Date();
  const to    = now.toISOString();
  if (filter === 'today') {
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    return { from, to };
  }
  if (filter === 'week') {
    const day  = now.getDay();
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day).toISOString();
    return { from, to };
  }
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  return { from, to };
}

function formatPurchasedAt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    + ' · '
    + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export default function PurchaseLogs(): JSX.Element {
  const toast = useToast();

  const [logs, setLogs] = useState<PurchaseLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');

  useEffect(() => {
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const range = getDateRange(dateFilter);
        const data = await getPurchaseLogs({ page, limit: PAGE_LIMIT, ...range });
        setLogs(data.logs);
        setTotal(data.total);
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Failed to load purchase log');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [page, dateFilter]); // toast is stable

  function handleFilterChange(f: DateFilter): void {
    setDateFilter(f);
    setPage(1);
  }

  const totalPages = Math.ceil(total / PAGE_LIMIT);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Teal header */}
      <div
        className="px-6 md:px-8 pt-8 pb-16"
        style={{
          background: 'linear-gradient(150deg, #26B8B2 0%, #1A9E98 45%, #14817C 100%)',
          borderRadius: '0 0 28px 28px',
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <PackagePlus size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-white text-2xl font-bold leading-tight">Purchase Log</h1>
            {!loading && (
              <p className="text-white/70 text-sm mt-0.5">
                {total} stock addition{total !== 1 ? 's' : ''} recorded
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 md:px-8 -mt-8 relative z-10 pb-8">
        {/* Date filter pills */}
        <div className="bg-white rounded-2xl shadow-sm px-4 py-3 mb-4 flex gap-2 flex-wrap">
          {DATE_FILTERS.map(tab => (
            <button
              key={tab.value}
              onClick={() => handleFilterChange(tab.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                dateFilter === tab.value
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Log entries */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            {Array.from({ length: 5 }).map((_, i) => <LogSkeleton key={i} />)}
          </div>
        ) : logs.length === 0 ? (
          <div className="mb-4"><EmptyState /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            {logs.map(log => <LogCard key={log.id} log={log} />)}
          </div>
        )}

        {/* Pagination */}
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

/* ── Product thumbnail with fallback ── */
function LogThumb({ src }: { src: string | null }): JSX.Element {
  const [err, setErr] = useState(false);

  if (!src || err) {
    return (
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: 'linear-gradient(135deg, #26B8B2 0%, #14817C 100%)' }}
      >
        <Boxes size={15} className="text-white" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt=""
      onError={() => setErr(true)}
      className="w-9 h-9 rounded-xl object-cover shrink-0 mt-0.5"
    />
  );
}

/* ── Log card ── */
function LogCard({ log }: { log: PurchaseLog }): JSX.Element {
  const variantPills = log.variantInfo
    ? Object.values(log.variantInfo).filter(Boolean).map(String)
    : [];

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <LogThumb src={log.productImage} />

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">{log.productName}</p>

            {variantPills.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {variantPills.map((val, i) => (
                  <span
                    key={i}
                    className="text-[10px] font-medium bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full"
                  >
                    {val}
                  </span>
                ))}
              </div>
            )}

            <p className="text-xs text-gray-400 mt-1.5">{formatPurchasedAt(log.purchasedAt)}</p>
          </div>
        </div>

        {/* Right: quantity + stock change */}
        <div className="shrink-0 text-right">
          <div className="inline-flex items-center gap-1 bg-emerald-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">
            <span>+{log.quantity}</span>
          </div>
          <p className="text-[11px] text-gray-400 mt-1.5 whitespace-nowrap">
            {log.stockBefore} → {log.stockAfter}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Skeleton ── */
function LogSkeleton(): JSX.Element {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-gray-100 shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="h-4 bg-gray-100 rounded w-2/3 mb-2" />
          <div className="h-3 bg-gray-100 rounded w-1/3" />
        </div>
        <div className="shrink-0">
          <div className="h-6 w-12 bg-gray-100 rounded-full" />
          <div className="h-3 bg-gray-100 rounded w-16 mt-1.5 ml-auto" />
        </div>
      </div>
    </div>
  );
}

/* ── Empty state ── */
function EmptyState(): JSX.Element {
  return (
    <div className="bg-white rounded-2xl shadow-sm py-16 text-center">
      <PackagePlus size={40} className="text-gray-200 mx-auto mb-3" />
      <p className="text-sm font-semibold text-gray-500">No purchases recorded yet</p>
      <p className="text-xs text-gray-400 mt-1">
        Stock added to a product or variant will show up here
      </p>
    </div>
  );
}
