import { useState, useEffect, useMemo, type JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Power, Eye, Package, ShieldCheck, ShieldAlert } from 'lucide-react';
import { type ColumnDef, type Row, type SortingState, type ColumnFiltersState } from '@tanstack/react-table';
import DataGrid from '../../components/ui/DataGrid';
import ToggleSwitch from '../../components/ui/ToggleSwitch';
import StatusBadge from '../../components/ui/StatusBadge';
import SellerDetail from './SellerDetail';
import { getSellerList, toggleSellerStatus, type Seller } from '../../services/sellerService';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { SkeletonAvatarCell, SkeletonNameBadgeCell } from '../../components/ui/SkeletonCells';
import { DEFAULT_PAGE_SIZE, STATUS_FILTER_OPTIONS } from '../../lib/constants';
import { getInitials, getAvatarColor } from '../../lib/avatar';

function SellerAvatar({ name }: { name: string | null }): JSX.Element {
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold ${getAvatarColor(name)}`}>
      {getInitials(name)}
    </div>
  );
}

function KycBadge({ verified }: { verified: boolean }): JSX.Element {
  const colors = verified
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : 'bg-amber-50 text-amber-700 border-amber-200';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors}`}>
      {verified ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
      {verified ? 'Verified' : 'Pending'}
    </span>
  );
}

export default function SellerList(): JSX.Element {
  const navigate = useNavigate();
  const toast = useToast();
  const { hasPermission } = useAuth();

  const [sellers, setSellers]           = useState<Seller[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [page, setPage]                 = useState(1);
  const [pageSize, setPageSize]         = useState(DEFAULT_PAGE_SIZE);
  const [totalRecords, setTotalRecords] = useState(0);

  const [sorting, setSorting]               = useState<SortingState>([{ id: 'fullName', desc: false }]);
  const initialFilters: ColumnFiltersState  = [];
  const [columnFilters, setColumnFilters]   = useState<ColumnFiltersState>(initialFilters);
  const [debouncedFilters, setDebouncedFilters] = useState<ColumnFiltersState>(initialFilters);

  const [deleteId, setDeleteId]   = useState<string | null>(null);
  const [toggleId, setToggleId]   = useState<string | null>(null);
  const [toggling, setToggling]   = useState(false);
  const [viewId, setViewId]       = useState<string | null>(null);

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

        const sortCol   = sorting[0];
        const fullName  = debouncedFilters.find(f => f.id === 'fullName')?.value as string | undefined;
        const bizName   = debouncedFilters.find(f => f.id === 'businessName')?.value as string | undefined;
        const mobile    = debouncedFilters.find(f => f.id === 'mobile')?.value as string | undefined;
        const isActive  = debouncedFilters.find(f => f.id === 'isActive')?.value as 'true' | 'false' | undefined;

        const data = await getSellerList({
          page,
          limit: pageSize,
          sortBy:       sortCol?.id,
          sortOrder:    sortCol ? (sortCol.desc ? 'desc' : 'asc') : undefined,
          fullName,
          businessName: bizName,
          mobile,
          isActive,
        });

        setSellers(data.sellers ?? []);
        setTotalRecords(data.pagination?.total ?? 0);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load sellers');
      } finally {
        setLoading(false);
      }
    }
    void fetch();
  }, [page, pageSize, sorting, debouncedFilters]);

  async function confirmToggle(id: string): Promise<void> {
    const prev = sellers.find(s => s.id === id);
    setSellers(list => list.map(s => s.id === id ? { ...s, isActive: !s.isActive } : s));
    setToggleId(null);
    setToggling(true);
    try {
      const result = await toggleSellerStatus(id);
      setSellers(list => list.map(s => s.id === id ? { ...s, isActive: result.isActive } : s));
      toast.success(result.isActive ? 'Seller activated' : 'Seller deactivated');
    } catch {
      if (prev) setSellers(list => list.map(s => s.id === id ? { ...s, isActive: prev.isActive } : s));
      toast.error('Failed to update seller status');
    } finally {
      setToggling(false);
    }
  }

  function confirmDelete(id: string): void {
    setSellers(prev => prev.filter(s => s.id !== id));
    setDeleteId(null);
    setTotalRecords(n => n - 1);
    toast.success('Seller removed');
  }

  const columns = useMemo<ColumnDef<Seller>[]>(() => [
    {
      accessorKey: 'fullName',
      header: 'Owner',
      enableSorting: true,
      enableColumnFilter: true,
      meta: {
        filterPlaceholder: 'Filter owner…',
        skeletonCell: () => <SkeletonAvatarCell />,
      },
      cell: ({ row }: { row: Row<Seller> }) => {
        const s = row.original;
        return (
          <div className="flex items-center gap-3">
            <SellerAvatar name={s.fullName} />
            <div>
              <p className="font-medium text-gray-900">{s.fullName || 'N/A'}</p>
              <p className="text-xs text-gray-400">{s.email || 'No email'}</p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'businessName',
      header: 'Shop',
      enableSorting: true,
      enableColumnFilter: true,
      meta: {
        filterPlaceholder: 'Filter shop…',
        skeletonCell: () => <SkeletonNameBadgeCell />,
      },
      cell: ({ row }: { row: Row<Seller> }) => {
        const s = row.original;
        return (
          <div>
            <p className="text-gray-700 font-medium">{s.businessName || 'N/A'}</p>
            {s.profile?.categories && s.profile.categories.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {s.profile.categories.map(c => (
                  <span key={c.id} className="inline-block px-2 py-0.5 text-xs bg-indigo-50 text-indigo-600 rounded-full font-medium">
                    {c.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'mobile',
      header: 'Mobile',
      enableSorting: true,
      enableColumnFilter: true,
      meta: { filterPlaceholder: 'Filter mobile…' },
      cell: ({ row }: { row: Row<Seller> }) => {
        const s = row.original;
        return (
          <span className="text-gray-600">
            {s.countryCode ? `(${s.countryCode}) ` : ''}{s.mobile}
          </span>
        );
      },
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
      cell: ({ row }: { row: Row<Seller> }) => <StatusBadge active={row.original.isActive} />,
    },
    {
      id: 'kyc',
      header: 'KYC',
      enableSorting: false,
      enableColumnFilter: false,
      cell: ({ row }: { row: Row<Seller> }) => <KycBadge verified={row.original.profile?.isVerified ?? false} />,
    },
    {
      accessorKey: 'createdAt',
      header: 'Joined',
      enableSorting: true,
      enableColumnFilter: false,
      meta: { align: 'right', className: 'w-32' },
      cell: ({ row }: { row: Row<Seller> }) => (
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
      cell: ({ row }: { row: Row<Seller> }) => {
        const s = row.original;
        return (
          <div className="flex items-center justify-end gap-2">
            {hasPermission('sellers', 'edit') && (
              <ToggleSwitch
                active={s.isActive}
                onToggle={() => { if (!toggling) setToggleId(s.id); }}
              />
            )}
            <div className="w-px h-4 bg-gray-200" />
            {hasPermission('sellers', 'view') && (
              <button
                onClick={() => setViewId(s.id)}
                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                title="View details"
              >
                <Eye className="w-4 h-4" />
              </button>
            )}
            {hasPermission('sellers', 'edit') && (
              <button
                onClick={() => { navigate(`/sellers/${s.id}/edit`); }}
                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                title="Edit"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            {hasPermission('products', 'list') && (
              <button
                onClick={() => { navigate(`/products?sellerId=${s.id}`); }}
                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                title="View products"
              >
                <Package className="w-4 h-4" />
              </button>
            )}
            {hasPermission('sellers', 'delete') && (
              <button
                onClick={() => setDeleteId(s.id)}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        );
      },
    },
  ].filter(col => {
    if (!('id' in col) || col.id !== 'actions') return true;
    return hasPermission('sellers', 'edit') || hasPermission('sellers', 'view') || hasPermission('sellers', 'delete') || hasPermission('products', 'list');
  }) as ColumnDef<Seller, unknown>[], [navigate, toggling, hasPermission]);

  if (error) {
    return <div className="p-8 text-center text-sm text-red-600">{error}</div>;
  }

  return (
    <div className="space-y-4">
      {hasPermission('sellers', 'add') && (
        <div className="flex items-center justify-end">
          <button
            onClick={() => { navigate('/sellers/add'); }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Seller
          </button>
        </div>
      )}

      <DataGrid
        columns={columns}
        data={sellers}
        loading={loading}
        skeletonRows={pageSize}
        emptyMessage="No sellers found"
        sorting={sorting}
        onSortingChange={setSorting}
        columnFilters={columnFilters}
        onColumnFiltersChange={setColumnFilters}
        pagination={{ page, pageSize, total: totalRecords, onPageChange: setPage, onPageSizeChange: size => { setPageSize(size); setPage(1); } }}
      />

      {toggleId !== null && (() => {
        const seller = sellers.find(s => s.id === toggleId);
        const willActivate = !seller?.isActive;
        return (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
              <div className={`flex items-center justify-center w-12 h-12 rounded-full mx-auto mb-4 ${willActivate ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                <Power className={`w-6 h-6 ${willActivate ? 'text-emerald-600' : 'text-amber-600'}`} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                {willActivate ? 'Activate seller?' : 'Deactivate seller?'}
              </h3>
              <p className="text-sm text-gray-500 text-center mb-1">
                <span className="font-medium text-gray-700">{seller?.businessName || 'This seller'}</span>
              </p>
              <p className="text-sm text-gray-500 text-center mb-6">
                {willActivate
                  ? 'The seller will be able to access the platform and receive orders.'
                  : 'The seller will be suspended and will not be able to receive orders.'}
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
        <SellerDetail
          sellerId={viewId}
          onClose={() => setViewId(null)}
          onToggled={(updated) => {
            setSellers(list => list.map(s => s.id === updated.id ? { ...s, isActive: updated.isActive } : s));
          }}
        />
      )}

      {deleteId !== null && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">Delete seller?</h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              This action cannot be undone. The seller and all their data will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { if (deleteId) confirmDelete(deleteId); }}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
