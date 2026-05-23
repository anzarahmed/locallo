import { useState, useEffect, type JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Pencil, Trash2, ChevronUp, ChevronDown, Power } from 'lucide-react';
import ToggleSwitch from '../../components/ui/ToggleSwitch';
import { getSellerList, toggleSellerStatus, type Seller } from '../../services/sellerService';
import { useToast } from '../../hooks/useToast';

type SortableKeys = 'fullName' | 'businessName' | 'mobile' | 'isActive';

interface Column {
  key: SortableKeys;
  label: string;
}

const COLUMNS: Column[] = [
  { key: 'fullName',     label: 'Owner' },
  { key: 'businessName', label: 'Shop'  },
  { key: 'mobile',       label: 'Mobile'},
  { key: 'isActive',     label: 'Status'},
];

const AVATAR_COLORS = [
  'bg-indigo-100 text-indigo-700',
  'bg-violet-100 text-violet-700',
  'bg-sky-100 text-sky-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
] as const;

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

function getAvatarColor(name: string | null): string {
  if (!name) return AVATAR_COLORS[0];
  const sum = [...name].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

function SellerAvatar({ name }: { name: string | null }): JSX.Element {
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold ${getAvatarColor(name)}`}>
      {getInitials(name)}
    </div>
  );
}

function SkeletonRow(): JSX.Element {
  return (
    <tr className="animate-pulse">
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0" />
          <div className="space-y-1.5">
            <div className="h-3.5 w-28 bg-gray-200 rounded" />
            <div className="h-3 w-20 bg-gray-100 rounded" />
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <div className="space-y-1.5">
          <div className="h-3.5 w-32 bg-gray-200 rounded" />
          <div className="h-4 w-20 bg-gray-100 rounded-full" />
        </div>
      </td>
      <td className="px-4 py-3.5">
        <div className="h-3.5 w-28 bg-gray-200 rounded" />
      </td>
      <td className="px-4 py-3.5">
        <div className="h-5 w-16 bg-gray-200 rounded-full" />
      </td>
      <td className="px-4 py-3.5">
        <div className="flex items-center justify-end gap-2">
          <div className="h-5 w-9 bg-gray-200 rounded-full" />
          <div className="h-7 w-7 bg-gray-100 rounded-md" />
          <div className="h-7 w-7 bg-gray-100 rounded-md" />
        </div>
      </td>
    </tr>
  );
}

interface SortIconProps {
  col: SortableKeys;
  sortKey: SortableKeys;
  sortAsc: boolean;
}

function SortIcon({ col, sortKey, sortAsc }: SortIconProps): JSX.Element {
  if (sortKey !== col) return <ChevronUp className="w-3.5 h-3.5 text-gray-300" />;
  return sortAsc
    ? <ChevronUp className="w-3.5 h-3.5 text-indigo-600" />
    : <ChevronDown className="w-3.5 h-3.5 text-indigo-600" />;
}

export default function SellerList(): JSX.Element {
  const navigate = useNavigate();
  const toast = useToast();

  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(5);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  const [search, setSearch] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');

  const [sortKey, setSortKey] = useState<SortableKeys>('fullName');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [toggleId, setToggleId] = useState<string | null>(null);
  const [toggling, setToggling] = useState<boolean>(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    async function fetchSellers(): Promise<void> {
      try {
        setLoading(true);
        setError(null);
        const data = await getSellerList(page, limit, debouncedSearch);
        setSellers(data.sellers || []);
        if (data.pagination) {
          setTotalRecords(data.pagination.total);
          setTotalPages(data.pagination.totalPages);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Something went wrong while fetching sellers');
      } finally {
        setLoading(false);
      }
    }
    fetchSellers();
  }, [page, limit, debouncedSearch]);

  function toggleSort(key: SortableKeys): void {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(true); }
  }

  const sortedSellers = [...sellers].sort((a: Seller, b: Seller): number => {
    let av = '';
    let bv = '';
    if (sortKey === 'businessName') {
      av = a.businessName || '';
      bv = b.businessName || '';
    } else if (sortKey === 'isActive') {
      av = a.isActive ? 'active' : 'inactive';
      bv = b.isActive ? 'active' : 'inactive';
    } else {
      av = String(a[sortKey] ?? '');
      bv = String(b[sortKey] ?? '');
    }
    return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
  });

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
      if (prev) {
        setSellers(list => list.map(s => s.id === id ? { ...s, isActive: prev.isActive } : s));
      }
      toast.error('Failed to update seller status');
    } finally {
      setToggling(false);
    }
  }

  async function confirmDelete(id: string): Promise<void> {
    setSellers(prev => prev.filter(s => s.id !== id));
    setDeleteId(null);
    toast.success('Seller removed');
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e): void => setSearch(e.target.value)}
            placeholder="Search sellers…"
            className="pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-72"
          />
        </div>
        <button
          onClick={(): void => { navigate('/sellers/add'); }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Seller
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {error ? (
          <div className="p-8 text-center text-sm text-red-600">{error}</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    {COLUMNS.map(col => (
                      <th
                        key={col.key}
                        onClick={(): void => toggleSort(col.key)}
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-gray-700"
                      >
                        <span className="inline-flex items-center gap-1">
                          {col.label}
                          <SortIcon col={col.key} sortKey={sortKey} sortAsc={sortAsc} />
                        </span>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                  ) : sortedSellers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-sm text-gray-400">
                        No sellers found
                      </td>
                    </tr>
                  ) : (
                    sortedSellers.map((seller: Seller) => (
                      <tr key={seller.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <SellerAvatar name={seller.fullName} />
                            <div>
                              <p className="font-medium text-gray-900">{seller.fullName || 'N/A'}</p>
                              <p className="text-xs text-gray-400">{seller.email || 'No email'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="text-gray-700 font-medium">{seller.businessName || 'N/A'}</p>
                          {seller.profile?.category?.name && (
                            <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-indigo-50 text-indigo-600 rounded-full font-medium">
                              {seller.profile.category.name}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-gray-600">
                          {seller.countryCode ? `(${seller.countryCode}) ` : ''}{seller.mobile}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                            seller.isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-gray-100 text-gray-600 border-gray-200'
                          }`}>
                            {seller.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center justify-end gap-2">
                            <ToggleSwitch
                              active={seller.isActive}
                              onToggle={(): void => { if (!toggling) setToggleId(seller.id); }}
                            />
                            <div className="w-px h-4 bg-gray-200" />
                            <button
                              onClick={(): void => { navigate(`/sellers/${seller.id}/edit`); }}
                              className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(): void => setDeleteId(seller.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {!loading && (
              <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
                <div>
                  Showing {sortedSellers.length} of {totalRecords} sellers
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      disabled={page === 1}
                      onClick={() => setPage(p => Math.max(p - 1, 1))}
                      className="px-2 py-1 border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span>Page {page} of {totalPages}</span>
                    <button
                      disabled={page === totalPages}
                      onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                      className="px-2 py-1 border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Toggle Status Modal */}
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
                  onClick={(): void => setToggleId(null)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={(): void => { if (toggleId) confirmToggle(toggleId); }}
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

      {/* Delete Modal */}
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
                onClick={(): void => setDeleteId(null)}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={(): void => { if (deleteId) confirmDelete(deleteId); }}
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
