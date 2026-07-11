import { useState, useEffect, useMemo, type JSX } from 'react';
import { Power, Eye, Heart } from 'lucide-react';
import { type ColumnDef, type Row, type SortingState, type ColumnFiltersState } from '@tanstack/react-table';
import DataGrid from '../../components/ui/DataGrid';
import ToggleSwitch from '../../components/ui/ToggleSwitch';
import StatusBadge from '../../components/ui/StatusBadge';
import CustomerDetail from './CustomerDetail';
import { getCustomerList, toggleCustomerStatus, type Customer } from '../../services/customerService';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { SkeletonAvatarCell } from '../../components/ui/SkeletonCells';
import { DEFAULT_PAGE_SIZE, STATUS_FILTER_OPTIONS, VERIFIED_FILTER_OPTIONS } from '../../lib/constants';
import { getInitials, getAvatarColor } from '../../lib/avatar';

function CustomerAvatar({ name }: { name: string | null }): JSX.Element {
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold ${getAvatarColor(name)}`}>
      {getInitials(name)}
    </div>
  );
}

function VerifiedBadge({ verified }: { verified: boolean }): JSX.Element {
  const colors = verified
    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
    : 'bg-gray-100 text-gray-600 border-gray-200';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors}`}>
      {verified ? 'Verified' : 'Unverified'}
    </span>
  );
}

export default function CustomerList(): JSX.Element {
  const toast = useToast();
  const { hasPermission } = useAuth();

  const [customers, setCustomers]       = useState<Customer[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [page, setPage]                 = useState(1);
  const [pageSize, setPageSize]         = useState(DEFAULT_PAGE_SIZE);
  const [totalRecords, setTotalRecords] = useState(0);

  const [sorting, setSorting]               = useState<SortingState>([{ id: 'createdAt', desc: true }]);
  const initialFilters: ColumnFiltersState  = [];
  const [columnFilters, setColumnFilters]   = useState<ColumnFiltersState>(initialFilters);
  const [debouncedFilters, setDebouncedFilters] = useState<ColumnFiltersState>(initialFilters);

  const [toggleId, setToggleId] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);
  const [viewId, setViewId]     = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters(columnFilters);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [columnFilters]);

  useEffect(() => {
    setPage(1);
  }, [sorting]);

  useEffect(() => {
    async function fetch(): Promise<void> {
      try {
        setLoading(true);
        setError(null);

        const sortCol     = sorting[0];
        const search      = debouncedFilters.find(f => f.id === 'fullName')?.value as string | undefined;
        const isVerified  = debouncedFilters.find(f => f.id === 'isVerified')?.value as 'true' | 'false' | undefined;
        const isActive    = debouncedFilters.find(f => f.id === 'isActive')?.value as 'true' | 'false' | undefined;

        const data = await getCustomerList({
          page,
          limit: pageSize,
          sortBy:    sortCol?.id,
          sortOrder: sortCol ? (sortCol.desc ? 'desc' : 'asc') : undefined,
          search,
          isVerified,
          isActive,
        });

        setCustomers(data.customers ?? []);
        setTotalRecords(data.total ?? 0);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load customers');
      } finally {
        setLoading(false);
      }
    }
    void fetch();
  }, [page, pageSize, sorting, debouncedFilters]);

  async function confirmToggle(id: string): Promise<void> {
    const prev = customers.find(c => c.id === id);
    setCustomers(list => list.map(c => c.id === id ? { ...c, isActive: !c.isActive } : c));
    setToggleId(null);
    setToggling(true);
    try {
      const result = await toggleCustomerStatus(id);
      setCustomers(list => list.map(c => c.id === id ? { ...c, isActive: result.isActive } : c));
      toast.success(result.isActive ? 'Customer activated' : 'Customer deactivated');
    } catch {
      if (prev) setCustomers(list => list.map(c => c.id === id ? { ...c, isActive: prev.isActive } : c));
      toast.error('Failed to update customer status');
    } finally {
      setToggling(false);
    }
  }

  const columns = useMemo<ColumnDef<Customer>[]>(() => [
    {
      accessorKey: 'fullName',
      header: 'Customer',
      enableSorting: true,
      enableColumnFilter: true,
      meta: {
        filterPlaceholder: 'Filter name or mobile…',
        skeletonCell: () => <SkeletonAvatarCell />,
      },
      cell: ({ row }: { row: Row<Customer> }) => {
        const c = row.original;
        return (
          <div className="flex items-center gap-3">
            <CustomerAvatar name={c.fullName} />
            <div>
              <p className="font-medium text-gray-900">{c.fullName || 'Unnamed'}</p>
              <p className="text-xs text-gray-400">
                {c.countryCode ? `(${c.countryCode}) ` : ''}{c.mobile}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'isVerified',
      header: 'Verified',
      enableSorting: true,
      enableColumnFilter: true,
      meta: {
        filterVariant: 'select',
        filterOptions: VERIFIED_FILTER_OPTIONS,
      },
      cell: ({ row }: { row: Row<Customer> }) => <VerifiedBadge verified={row.original.isVerified} />,
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      enableSorting: true,
      enableColumnFilter: true,
      meta: {
        filterVariant: 'select',
        filterOptions: STATUS_FILTER_OPTIONS,
      },
      cell: ({ row }: { row: Row<Customer> }) => <StatusBadge active={row.original.isActive} />,
    },
    {
      accessorKey: 'wishlistCount',
      header: 'Wishlist',
      enableSorting: false,
      enableColumnFilter: false,
      meta: { align: 'center', className: 'w-24' },
      cell: ({ row }: { row: Row<Customer> }) => (
        <span className="inline-flex items-center gap-1.5 text-gray-600">
          <Heart className="w-3.5 h-3.5 text-gray-400" />
          {row.original.wishlistCount}
        </span>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Joined',
      enableSorting: true,
      enableColumnFilter: false,
      meta: { align: 'right', className: 'w-32' },
      cell: ({ row }: { row: Row<Customer> }) => (
        <span className="text-gray-500 text-sm">
          {new Date(row.original.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      enableColumnFilter: false,
      meta: { hideFromVisibility: true, align: 'right' },
      cell: ({ row }: { row: Row<Customer> }) => {
        const c = row.original;
        return (
          <div className="flex items-center justify-end gap-2">
            {hasPermission('customers', 'edit') && (
              <ToggleSwitch
                active={c.isActive}
                onToggle={() => { if (!toggling) setToggleId(c.id); }}
              />
            )}
            <div className="w-px h-4 bg-gray-200" />
            {hasPermission('customers', 'view') && (
              <button
                onClick={() => setViewId(c.id)}
                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                title="View details"
              >
                <Eye className="w-4 h-4" />
              </button>
            )}
          </div>
        );
      },
    },
  ].filter(col => {
    if (!('id' in col) || col.id !== 'actions') return true;
    return hasPermission('customers', 'edit') || hasPermission('customers', 'view');
  }) as ColumnDef<Customer, unknown>[], [toggling, hasPermission]);

  if (error) {
    return <div className="p-8 text-center text-sm text-red-600">{error}</div>;
  }

  return (
    <div className="space-y-4">
      <DataGrid
        columns={columns}
        data={customers}
        loading={loading}
        skeletonRows={pageSize}
        emptyMessage="No customers found"
        sorting={sorting}
        onSortingChange={setSorting}
        columnFilters={columnFilters}
        onColumnFiltersChange={setColumnFilters}
        pagination={{ page, pageSize, total: totalRecords, onPageChange: setPage, onPageSizeChange: size => { setPageSize(size); setPage(1); } }}
      />

      {toggleId !== null && (() => {
        const customer = customers.find(c => c.id === toggleId);
        const willActivate = !customer?.isActive;
        return (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
              <div className={`flex items-center justify-center w-12 h-12 rounded-full mx-auto mb-4 ${willActivate ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                <Power className={`w-6 h-6 ${willActivate ? 'text-emerald-600' : 'text-amber-600'}`} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                {willActivate ? 'Activate customer?' : 'Deactivate customer?'}
              </h3>
              <p className="text-sm text-gray-500 text-center mb-1">
                <span className="font-medium text-gray-700">{customer?.fullName || 'This customer'}</span>
              </p>
              <p className="text-sm text-gray-500 text-center mb-6">
                {willActivate
                  ? 'The customer will be able to log in and use the app again.'
                  : 'The customer will be signed out and unable to log in.'}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setToggleId(null)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { if (toggleId) void confirmToggle(toggleId); }}
                  disabled={toggling}
                  className={`flex-1 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                    willActivate ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-500 hover:bg-amber-600'
                  }`}
                >
                  {willActivate ? 'Activate' : 'Deactivate'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {viewId !== null && (
        <CustomerDetail
          customerId={viewId}
          onClose={() => setViewId(null)}
          onToggled={(updated) => {
            setCustomers(list => list.map(c => c.id === updated.id ? { ...c, isActive: updated.isActive } : c));
          }}
        />
      )}
    </div>
  );
}
