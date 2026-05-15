import { useState, type JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Pencil, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { MOCK_SELLERS } from './sellerData';
import type { Seller } from '../../types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Column {
  key: keyof Seller;
  label: string;
}

const COLUMNS: Column[] = [
  { key: 'name',         label: 'Seller' },
  { key: 'businessName', label: 'Business' },
  { key: 'phone',        label: 'Phone' },
  { key: 'status',       label: 'Status' },
  { key: 'createdAt',    label: 'Joined' },
];

const STATUS_STYLES: Record<Seller['status'], string> = {
  active:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  inactive: 'bg-gray-100 text-gray-600 border-gray-200',
  pending:  'bg-amber-50 text-amber-700 border-amber-200',
};

// ── Sort icon (defined outside component to avoid re-creation on each render) ─

interface SortIconProps {
  col: keyof Seller;
  sortKey: keyof Seller;
  sortAsc: boolean;
}

function SortIcon({ col, sortKey, sortAsc }: SortIconProps): JSX.Element {
  if (sortKey !== col) return <ChevronUp className="w-3.5 h-3.5 text-gray-300" />;
  return sortAsc
    ? <ChevronUp className="w-3.5 h-3.5 text-indigo-600" />
    : <ChevronDown className="w-3.5 h-3.5 text-indigo-600" />;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SellerList(): JSX.Element {
  const navigate = useNavigate();
  const [sellers, setSellers] = useState<Seller[]>(MOCK_SELLERS);
  const [search, setSearch] = useState<string>('');
  const [sortKey, setSortKey] = useState<keyof Seller>('createdAt');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  function toggleSort(key: keyof Seller): void {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(true); }
  }

  const filtered: Seller[] = sellers
    .filter((s: Seller): boolean =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.businessName.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a: Seller, b: Seller): number => {
      const av = String(a[sortKey] ?? '');
      const bv = String(b[sortKey] ?? '');
      return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
    });

  function confirmDelete(id: number): void {
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

      {/* Table */}
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
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-400">
                    No sellers found
                  </td>
                </tr>
              ) : (
                filtered.map((seller: Seller) => (
                  <tr key={seller.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3.5">
                      <div>
                        <p className="font-medium text-gray-900">{seller.name}</p>
                        <p className="text-xs text-gray-400">{seller.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-gray-600">{seller.businessName}</td>
                    <td className="px-4 py-3.5 text-gray-600">{seller.phone}</td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${STATUS_STYLES[seller.status]}`}>
                        {seller.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-gray-500">
                      {new Date(seller.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1">
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
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
          Showing {filtered.length} of {sellers.length} sellers
        </div>
      </div>

      {/* Delete Confirm Modal */}
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
                onClick={(): void => confirmDelete(deleteId)}
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
