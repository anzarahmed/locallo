import { useState, useEffect, type JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Pencil, Trash2, ChevronUp, ChevronDown, Power } from 'lucide-react';
import ToggleSwitch from '../../components/ui/ToggleSwitch';
import { getSellerList, type Seller } from '../../services/sellerService';

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
  
  // API Core States
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination States
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(5);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Search States (Immediate UI value vs Delayed Debounced API value)
  const [search, setSearch] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');

  // Sorting States
  const [sortKey, setSortKey] = useState<SortableKeys>('fullName');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  
  // Modals States
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [toggleId, setToggleId] = useState<string | null>(null);

  // Debounce mechanism for search text
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset back to page 1 whenever search terms change
    }, 500);

    return () => clearTimeout(handler);
  }, [search]);

  // Fetch Sellers strictly handling server-side parameters
  useEffect(() => {
    async function fetchSellers() {
      try {
        setLoading(true);
        setError(null);
        
        // Passing page, limit, and our debounced search state
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
  }, [page, limit, debouncedSearch]); // Reloads automatically on changes

  function toggleSort(key: SortableKeys): void {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(true); }
  }

  // Frontend Sorting (Keeping this local for instant header toggles)
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
    setSellers(prev => prev.map(s =>
      s.id === id ? { ...s, isActive: !s.isActive } : s
    ));
    setToggleId(null);
  }

  async function confirmDelete(id: string): Promise<void> {
    setSellers(prev => prev.filter(s => s.id !== id));
    setDeleteId(null);
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
            placeholder="Search sellers..."
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

      {/* Main Table Setup */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-sm text-gray-500">
          Loading sellers list...
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-6 text-sm text-center">
          {error}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
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
                {sortedSellers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-sm text-gray-400">
                      No sellers found
                    </td>
                  </tr>
                ) : (
                  sortedSellers.map((seller: Seller) => (
                    <tr key={seller.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3.5">
                        <div>
                          <p className="font-medium text-gray-900">{seller.fullName || 'N/A'}</p>
                          <p className="text-xs text-gray-400">{seller.email || 'No Email'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-gray-600">
                        {seller.businessName || 'N/A'}
                      </td>
                      <td className="px-4 py-3.5 text-gray-600">
                        {seller.countryCode ? `(${seller.countryCode}) ` : ''}{seller.mobile}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${
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
                            onToggle={(): void => setToggleId(seller.id)}
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
          
          {/* Pagination Controls */}
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
            <div>
              Showing {sortedSellers.length} of {totalRecords} records
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
        </div>
      )}

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
                  className={`flex-1 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
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