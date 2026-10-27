import { useEffect, useState, type JSX } from 'react';
import { Gauge, ListChecks } from 'lucide-react';
import { getProductLimitLogs, getProductLimits } from '../../services/sellerService';
import { useToast } from '../../hooks/useToast';
import { ApiError } from '../../lib/axios';
import { formatDateTime } from '../../lib/dateFormat';
import type { CategoryLimit, ProductLimitLog, ProductLimitReason } from '../../types';

const PAGE_LIMIT = 20;
// Usage log is hidden from sellers for now; the API and data stay in place.
const SHOW_USAGE_LOG = false;

const REASON_LABELS: Record<ProductLimitReason, string> = {
  product:         'Product',
  variant_group:   'Variant group',
  initial_balance: 'Initial balance',
};

const REASON_CLASSES: Record<ProductLimitReason, string> = {
  product:         'bg-teal-50 text-teal-700',
  variant_group:   'bg-indigo-50 text-indigo-700',
  initial_balance: 'bg-gray-100 text-gray-600',
};

export default function ProductLimits(): JSX.Element {
  const toast = useToast();

  const [limits, setLimits] = useState<CategoryLimit[]>([]);
  const [limitsLoading, setLimitsLoading] = useState(true);
  const [logs, setLogs] = useState<ProductLimitLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [logsLoading, setLogsLoading] = useState(true);
  const [categoryId, setCategoryId] = useState<number | null>(null);

  useEffect(() => {
    getProductLimits()
      .then(data => setLimits(data.limits))
      .catch((err: unknown) => toast.error(err instanceof ApiError ? err.message : 'Failed to load listing limits'))
      .finally(() => setLimitsLoading(false));
  }, []); // toast is stable

  useEffect(() => {
    if (!SHOW_USAGE_LOG) return;
    async function load(): Promise<void> {
      setLogsLoading(true);
      try {
        const data = await getProductLimitLogs({ page, limit: PAGE_LIMIT, ...(categoryId !== null && { categoryId }) });
        setLogs(data.logs);
        setTotal(data.total);
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Failed to load usage log');
      } finally {
        setLogsLoading(false);
      }
    }
    void load();
  }, [page, categoryId]); // toast is stable

  function handleCategoryChange(id: number | null): void {
    setCategoryId(id);
    setPage(1);
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
            <Gauge size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-white text-2xl font-bold leading-tight">Listing Limits</h1>
            <p className="text-white/70 text-sm mt-0.5">
              Each product without variants, or each variant group, uses 1 listing
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 md:px-8 -mt-8 relative z-10 pb-8 space-y-6">
        {limitsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => <LimitSkeleton key={i} />)}
          </div>
        ) : limits.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm py-10 text-center text-sm text-gray-500">
            No categories are assigned to your shop yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {limits.map(limit => <LimitCard key={limit.categoryId} limit={limit} />)}
          </div>
        )}

        <p className="text-xs text-gray-500 -mt-3">
          Units are used permanently: deleting a product or variant group does not restore them.
        </p>

        {SHOW_USAGE_LOG && (
          <div>
            <h2 className="text-base font-bold text-gray-800 mb-3">Usage log</h2>

            {limits.length > 1 && (
              <div className="bg-white rounded-2xl shadow-sm px-4 py-3 mb-4 flex gap-2 flex-wrap">
                <FilterPill active={categoryId === null} label="All" onClick={() => handleCategoryChange(null)} />
                {limits.map(l => (
                  <FilterPill
                    key={l.categoryId}
                    active={categoryId === l.categoryId}
                    label={l.categoryName}
                    onClick={() => handleCategoryChange(l.categoryId)}
                  />
                ))}
              </div>
            )}

            {logsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <LogSkeleton key={i} />)}
              </div>
            ) : logs.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm py-16 text-center">
                <ListChecks size={40} className="text-gray-200 mx-auto mb-3" />
                <p className="text-sm font-semibold text-gray-500">No listing units used yet</p>
                <p className="text-xs text-gray-400 mt-1">Every product or variant group you add will show up here</p>
              </div>
            ) : (
              <div className="space-y-2">
                {logs.map(log => <LogRow key={log.id} log={log} />)}
              </div>
            )}

            {!logsLoading && totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
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
        )}
      </div>
    </div>
  );
}

function FilterPill({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }): JSX.Element {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
        active ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
      }`}
    >
      {label}
    </button>
  );
}

function barColor(percent: number): string {
  if (percent >= 100) return 'bg-red-500';
  if (percent >= 90) return 'bg-amber-500';
  return 'bg-teal-500';
}

function LimitCard({ limit }: { limit: CategoryLimit }): JSX.Element {
  const percent = limit.limit === 0 ? 100 : Math.min(100, Math.round((limit.used / limit.limit) * 100));
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-gray-800 truncate">{limit.categoryName}</p>
        {limit.remaining === 0 && (
          <span className="text-[10px] font-semibold bg-red-50 text-red-600 px-2 py-0.5 rounded-full shrink-0">
            Limit reached
          </span>
        )}
      </div>
      <p className="mt-2">
        <span className="text-2xl font-bold text-gray-900">{limit.used}</span>
        <span className="text-sm text-gray-400"> / {limit.limit} used</span>
      </p>
      <div className="h-2 bg-gray-100 rounded-full mt-3 overflow-hidden">
        <div className={`h-full rounded-full ${barColor(percent)}`} style={{ width: `${percent}%` }} />
      </div>
      <p className="text-xs text-gray-500 mt-2">{limit.remaining} remaining</p>
    </div>
  );
}

function LogRow({ log }: { log: ProductLimitLog }): JSX.Element {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-gray-800 truncate">{log.productName}</p>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${REASON_CLASSES[log.reason]}`}>
            {REASON_LABELS[log.reason]}
          </span>
        </div>
        {log.groupLabel && <p className="text-xs text-gray-600 mt-1">{log.groupLabel}</p>}
        <p className="text-xs text-gray-400 mt-1">
          {log.categoryName} · {formatDateTime(log.createdAt)}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <span className="inline-flex text-white text-xs font-bold px-2.5 py-1 rounded-full bg-red-500">
          −{log.units}
        </span>
        <p className="text-[11px] text-gray-400 mt-1.5 whitespace-nowrap">
          {log.remainingAfter === null ? `${log.usedAfter} used` : `${log.remainingAfter} left`}
        </p>
      </div>
    </div>
  );
}

function LimitSkeleton(): JSX.Element {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 animate-pulse">
      <div className="h-4 bg-gray-100 rounded w-1/2" />
      <div className="h-7 bg-gray-100 rounded w-1/3 mt-3" />
      <div className="h-2 bg-gray-100 rounded-full mt-3" />
    </div>
  );
}

function LogSkeleton(): JSX.Element {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 animate-pulse flex justify-between">
      <div className="flex-1">
        <div className="h-4 bg-gray-100 rounded w-2/3 mb-2" />
        <div className="h-3 bg-gray-100 rounded w-1/3" />
      </div>
      <div className="h-6 w-10 bg-gray-100 rounded-full" />
    </div>
  );
}
