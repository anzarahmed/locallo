import { useEffect, useState, type JSX, type ReactNode } from 'react';
import { CreditCard, ShoppingBag } from 'lucide-react';
import { getPayments } from '../../services/sellerService';
import { useToast } from '../../hooks/useToast';
import { ApiError } from '../../lib/axios';
import type { Payment, PaymentStatus } from '../../types';
import { formatDateTime } from '../../lib/dateFormat';

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
        const data = await getPayments({
          page,
          limit: PAGE_LIMIT,
          ...(statusFilter !== 'all' && { paymentStatus: statusFilter }),
        });
        setPayments(data.payments);
        setTotal(data.total);
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Failed to load payments');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [page, statusFilter]); // toast is stable

  function handleFilterChange(f: StatusFilter): void {
    setStatusFilter(f);
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
          <PaymentTable rows={<PaymentSkeletonRows />} />
        ) : payments.length === 0 ? (
          <div className="mb-4"><EmptyState /></div>
        ) : (
          <PaymentTable
            rows={payments.map(payment => <PaymentRow key={payment.id} payment={payment} />)}
          />
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

/* ── Payment table ── */
function PaymentTable({ rows }: { rows: ReactNode }): JSX.Element {
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-x-auto mb-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left font-semibold text-gray-500 px-4 py-3 whitespace-nowrap">Product</th>
            <th className="text-left font-semibold text-gray-500 px-4 py-3 whitespace-nowrap">Audience</th>
            <th className="text-left font-semibold text-gray-500 px-4 py-3 whitespace-nowrap">Date</th>
            <th className="text-right font-semibold text-gray-500 px-4 py-3 whitespace-nowrap">Amount</th>
            <th className="text-right font-semibold text-gray-500 px-4 py-3 whitespace-nowrap">Status</th>
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    </div>
  );
}

/* ── Payment row ── */
function PaymentRow({ payment }: { payment: Payment }): JSX.Element {
  return (
    <tr className="border-b border-gray-50 last:border-0">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <PaymentThumb src={payment.productImage} />
          <p className="text-sm font-semibold text-gray-800 truncate max-w-[220px]">{payment.productName}</p>
        </div>
      </td>
      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{audienceLabel(payment)}</td>
      <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{formatDateTime(payment.createdAt)}</td>
      <td className="px-4 py-3 text-right font-bold text-gray-800 whitespace-nowrap">₹{payment.amount}</td>
      <td className="px-4 py-3 text-right whitespace-nowrap">
        <span
          className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_BADGE[payment.paymentStatus]}`}
        >
          {payment.paymentStatus}
        </span>
      </td>
    </tr>
  );
}

/* ── Skeleton ── */
function PaymentSkeletonRows(): JSX.Element {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b border-gray-50 last:border-0 animate-pulse">
          <td className="px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gray-100 shrink-0" />
              <div className="h-4 bg-gray-100 rounded w-32" />
            </div>
          </td>
          <td className="px-4 py-3"><div className="h-3 bg-gray-100 rounded w-20" /></td>
          <td className="px-4 py-3"><div className="h-3 bg-gray-100 rounded w-24" /></td>
          <td className="px-4 py-3"><div className="h-4 bg-gray-100 rounded w-12 ml-auto" /></td>
          <td className="px-4 py-3"><div className="h-3 bg-gray-100 rounded-full w-16 ml-auto" /></td>
        </tr>
      ))}
    </>
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
