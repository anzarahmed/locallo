import { useState, useEffect, useMemo, type JSX } from 'react';
import { ShoppingBag } from 'lucide-react';
import { type ColumnDef, type Row, type SortingState, type ColumnFiltersState } from '@tanstack/react-table';
import DataGrid from '../../components/ui/DataGrid';
import { getPayments } from '../../services/paymentService';
import { getAllSellers, type Seller } from '../../services/sellerService';
import type { Payment, PaymentStatus } from '../../types';
import { DEFAULT_PAGE_SIZE, PAYMENT_STATUS_FILTER_OPTIONS } from '../../lib/constants';

function formatAmount(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

function audienceLabel(payment: Payment): string {
  if (payment.audienceType === 'pan_india') return 'Pan India';
  if (payment.audienceType === 'state') return `State: ${payment.state ?? '—'}`;
  return `City: ${payment.city ?? '—'}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    + ' · '
    + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

const STATUS_BADGE: Record<PaymentStatus, string> = {
  paid:      'bg-emerald-50 text-emerald-700',
  pending:   'bg-amber-50 text-amber-700',
  failed:    'bg-rose-50 text-rose-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

function PaymentThumb({ src }: { src: string | null }): JSX.Element {
  const [err, setErr] = useState(false);
  if (!src || err) {
    return (
      <div className="w-9 h-9 rounded-lg bg-gray-100 shrink-0 flex items-center justify-center">
        <ShoppingBag className="w-4 h-4 text-gray-300" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt=""
      onError={() => setErr(true)}
      className="w-9 h-9 rounded-lg object-cover shrink-0"
    />
  );
}

export default function PaymentList(): JSX.Element {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sellers, setSellers]   = useState<Seller[]>([]);

  const [sorting, setSorting]                   = useState<SortingState>([]);
  const [columnFilters, setColumnFilters]       = useState<ColumnFiltersState>([]);
  const [debouncedFilters, setDebouncedFilters] = useState<ColumnFiltersState>([]);

  useEffect((): void => {
    getAllSellers().then(setSellers).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters(columnFilters);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [columnFilters]);

  useEffect(() => { setPage(1); }, [sorting]);

  useEffect((): void => {
    setLoading(true);
    setError(null);

    const sortCol          = sorting[0];
    const search           = debouncedFilters.find(f => f.id === 'product')?.value as string | undefined;
    const sellerIdVal      = debouncedFilters.find(f => f.id === 'seller')?.value as string | undefined;
    const paymentStatusVal = debouncedFilters.find(f => f.id === 'paymentStatus')?.value as string | undefined;

    const params = {
      page,
      limit: pageSize,
      ...(search           && { search }),
      ...(sellerIdVal      && { sellerId: sellerIdVal }),
      ...(paymentStatusVal && { paymentStatus: paymentStatusVal }),
      ...(sortCol          && { sortBy: sortCol.id, sortOrder: sortCol.desc ? 'desc' as const : 'asc' as const }),
    };

    getPayments(params)
      .then(r => { setPayments(r.payments); setTotal(r.total); })
      .catch(() => { setError('Failed to load payments.'); })
      .finally(() => { setLoading(false); });
  }, [page, pageSize, sorting, debouncedFilters]);

  const columns = useMemo<ColumnDef<Payment>[]>(() => [
    {
      id: 'product',
      accessorKey: 'productName',
      header: 'Product',
      enableSorting: false,
      enableColumnFilter: true,
      meta: { filterPlaceholder: 'Search products…' },
      cell: ({ row }: { row: Row<Payment> }) => {
        const p = row.original;
        return (
          <div className="flex items-center gap-3">
            <PaymentThumb src={p.productImage} />
            <span className="font-medium text-gray-900 max-w-48 truncate" title={p.productName}>{p.productName}</span>
          </div>
        );
      },
    },
    {
      id: 'seller',
      accessorKey: 'sellerName',
      header: 'Seller',
      enableSorting: false,
      enableColumnFilter: true,
      meta: {
        filterVariant: 'combobox',
        filterOptions: sellers.map(s => ({
          label: s.businessName ?? s.fullName ?? s.mobile,
          value: s.id,
        })),
      },
      cell: ({ row }: { row: Row<Payment> }) => (
        <span className="text-gray-600 max-w-36 truncate block">{row.original.sellerName}</span>
      ),
    },
    {
      id: 'audience',
      header: 'Audience',
      enableSorting: false,
      enableColumnFilter: false,
      cell: ({ row }: { row: Row<Payment> }) => (
        <span className="text-gray-500">{audienceLabel(row.original)}</span>
      ),
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      enableSorting: true,
      enableColumnFilter: false,
      meta: { align: 'right' },
      cell: ({ row }: { row: Row<Payment> }) => (
        <span className="font-medium text-gray-900">{formatAmount(row.original.amount)}</span>
      ),
    },
    {
      accessorKey: 'paymentStatus',
      header: 'Status',
      enableSorting: false,
      enableColumnFilter: true,
      meta: {
        filterVariant: 'select',
        filterOptions: PAYMENT_STATUS_FILTER_OPTIONS,
        align: 'center',
      },
      cell: ({ row }: { row: Row<Payment> }) => (
        <div className="flex justify-center">
          <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_BADGE[row.original.paymentStatus]}`}>
            {row.original.paymentStatus}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Date',
      enableSorting: true,
      enableColumnFilter: false,
      cell: ({ row }: { row: Row<Payment> }) => (
        <span className="text-gray-500 whitespace-nowrap">{formatDate(row.original.createdAt)}</span>
      ),
    },
  ] as ColumnDef<Payment, unknown>[], [sellers]);

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Payments</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} total</p>
        </div>
      </div>

      <DataGrid
        columns={columns}
        data={payments}
        loading={loading}
        skeletonRows={pageSize}
        emptyMessage="No payments found"
        sorting={sorting}
        onSortingChange={setSorting}
        columnFilters={columnFilters}
        onColumnFiltersChange={setColumnFilters}
        pagination={{ page, pageSize, total, onPageChange: setPage, onPageSizeChange: size => { setPageSize(size); setPage(1); } }}
      />
    </>
  );
}
