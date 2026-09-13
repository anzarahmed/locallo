import { useEffect, useState, type JSX } from 'react';
import { CreditCard, ShoppingBag } from 'lucide-react';
import { getPayments } from '../../services/sellerService';
import { useToast } from '../../hooks/useToast';
import { ApiError } from '../../lib/axios';
import type { Payment, PaymentStatus } from '../../types';

const PAGE_LIMIT = 20;

type StatusFilter = 'all' | PaymentStatus;

interface StatusFilterTab {
  value: StatusFilter;
  label: string;
}

const STATUS_FILTERS: StatusFilterTab[] = [
  { value: 'all',       label: 'All'       },
  { value: 'paid',      label: 'Paid'      },
  { value: 'pending',   label: 'Pending'   },
  { value: 'failed',    label: 'Failed'    },
  { value: 'cancelled', label: 'Cancelled' },
];

const STATUS_BADGE: Record<PaymentStatus, string> = {
  paid:      'bg-emerald-50 text-emerald-700',
  pending:   'bg-amber-50 text-amber-700',
  failed:    'bg-rose-50 text-rose-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

function audienceLabel(payment: Payment): string {
  if (payment.audienceType === 'pan_india') return 'Pan India';
  if (payment.audienceType === 'state') return `State: ${payment.state ?? '—'}`;
  return `City: ${payment.city ?? '—'}`;
}

function formatCreatedAt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    + ' · '
    + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export default function PaymentList(): JSX.Element {
  const toast = useToast();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const data = await getPayments({ page, limit: PAGE_LIMIT });
        setPayments(data.payments);
        setTotal(data.total);
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Failed to load payments');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [page]); // toast is stable

  function handleFilterChange(f: StatusFilter): void {
    setStatusFilter(f);
    setPage(1);
  }

  const visiblePayments = statusFilter === 'all'
    ? payments
    : payments.filter(p => p.paymentStatus === statusFilter);

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
            <CreditCard size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-white text-2xl font-bold leading-tight">Payments</h1>
            {!loading && (
              <p className="text-white/70 text-sm mt-0.5">
                {total} payment{total !== 1 ? 's' : ''} made
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 md:px-8 -mt-8 relative z-10 pb-8">
        {/* Status filter pills */}
        <div className="bg-white rounded-2xl shadow-sm px-4 py-3 mb-4 flex gap-2 flex-wrap">
          {STATUS_FILTERS.map(tab => (
            <button
              key={tab.value}
              onClick={() => handleFilterChange(tab.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                statusFilter === tab.value
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Payment entries */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            {Array.from({ length: 5 }).map((_, i) => <PaymentSkeleton key={i} />)}
          </div>
        ) : visiblePayments.length === 0 ? (
          <div className="mb-4"><EmptyState /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            {visiblePayments.map(payment => <PaymentCard key={payment.id} payment={payment} />)}
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
function PaymentThumb({ src }: { src: string | null }): JSX.Element {
  const [err, setErr] = useState(false);

  if (!src || err) {
    return (
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: 'linear-gradient(135deg, #26B8B2 0%, #14817C 100%)' }}
      >
        <ShoppingBag size={15} className="text-white" />
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

/* ── Payment card ── */
function PaymentCard({ payment }: { payment: Payment }): JSX.Element {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <PaymentThumb src={payment.productImage} />

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">{payment.productName}</p>
            <p className="text-xs text-gray-400 mt-1">{audienceLabel(payment)}</p>
            <p className="text-xs text-gray-400 mt-1.5">{formatCreatedAt(payment.createdAt)}</p>
          </div>
        </div>

        {/* Right: amount + status badge */}
        <div className="shrink-0 text-right">
          <p className="text-sm font-bold text-gray-800">₹{payment.amount}</p>
          <span
            className={`inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_BADGE[payment.paymentStatus]}`}
          >
            {payment.paymentStatus}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Skeleton ── */
function PaymentSkeleton(): JSX.Element {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-gray-100 shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="h-4 bg-gray-100 rounded w-2/3 mb-2" />
          <div className="h-3 bg-gray-100 rounded w-1/3" />
        </div>
        <div className="shrink-0">
          <div className="h-4 w-12 bg-gray-100 rounded ml-auto" />
          <div className="h-3 w-16 bg-gray-100 rounded-full mt-1.5" />
        </div>
      </div>
    </div>
  );
}

/* ── Empty state ── */
function EmptyState(): JSX.Element {
  return (
    <div className="bg-white rounded-2xl shadow-sm py-16 text-center">
      <CreditCard size={40} className="text-gray-200 mx-auto mb-3" />
      <p className="text-sm font-semibold text-gray-500">No payments yet</p>
      <p className="text-xs text-gray-400 mt-1">
        Boost a product to promote it to more customers
      </p>
    </div>
  );
}
