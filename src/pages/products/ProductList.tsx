import { useState, useEffect, useRef, type JSX } from 'react';
import { Search, Loader2, Package, Trash2, Eye, AlertCircle, ChevronDown } from 'lucide-react';
import ToggleSwitch from '../../components/ui/ToggleSwitch';
import ProductDetail from './ProductDetail';
import { getProducts, toggleProduct, deleteProduct } from '../../services/productService';
import { getCategories } from '../../services/categoryService';
import { ApiError } from '../../lib/axios';
import type { Category, Product } from '../../types';
import { useToast } from '../../hooks/useToast';

const PAGE_SIZE = 20;

function imgUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${import.meta.env.VITE_API_URL as string}${path}`;
}

function formatPrice(val: number | string | null): string {
  if (val === null || val === undefined) return '—';
  return `₹${Number(val).toLocaleString('en-IN')}`;
}

function ThumbnailImage({ src, alt }: { src: string; alt: string }): JSX.Element {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  return (
    <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 shrink-0 relative">
      {status === 'loading' && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200" />
      )}
      {status === 'error' ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <Package className="w-4 h-4 text-gray-300" />
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          onLoad={(): void => setStatus('loaded')}
          onError={(): void => setStatus('error')}
          className={`w-full h-full object-cover transition-opacity duration-150 ${status === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
    </div>
  );
}

// ── DeleteModal ────────────────────────────────────────────────────────────────

interface DeleteModalProps {
  product: Product;
  onClose: () => void;
  onDeleted: (id: string) => void;
}

function DeleteModal({ product, onClose, onDeleted }: DeleteModalProps): JSX.Element {
  const [deleting, setDeleting] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const toast = useToast();

  async function handleDelete(): Promise<void> {
    setDeleting(true);
    try {
      await deleteProduct(product.id);
      toast.success('Product deleted');
      onDeleted(product.id);
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.message : 'Failed to delete';
      setError(message);
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto">
          <Trash2 className="w-6 h-6 text-red-600" />
        </div>
        <div className="text-center">
          <h3 className="text-base font-semibold text-gray-900">Delete product?</h3>
          <p className="mt-1 text-sm text-gray-500">
            <span className="font-medium text-gray-700">{product.name}</span> will be permanently removed.
          </p>
        </div>
        {error && (
          <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
            Cancel
          </button>
          <button
            onClick={(): void => { void handleDelete(); }}
            disabled={deleting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 disabled:opacity-60 transition-colors"
          >
            {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ProductList ────────────────────────────────────────────────────────────────

export default function ProductList(): JSX.Element {
  const toast = useToast();
  const [products, setProducts]   = useState<Product[]>([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [page, setPage]           = useState(1);
  const [searchInput, setSearchInput]   = useState('');
  const [search, setSearch]       = useState('');
  const [categoryFilter, setCategoryFilter] = useState<number | ''>('');
  const [statusFilter, setStatusFilter]     = useState<'' | 'true' | 'false'>('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [toggling, setToggling]   = useState<string | null>(null);
  const [detailId, setDetailId]   = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect((): void => {
    getCategories(false)
      .then(setCategories)
      .catch((): void => {});
  }, []);

  useEffect((): void => {
    setLoading(true);
    setError(null);
    const params = {
      page,
      limit: PAGE_SIZE,
      ...(search          && { search }),
      ...(categoryFilter  && { categoryId: categoryFilter as number }),
      ...(statusFilter    && { isActive: statusFilter === 'true' }),
    };
    getProducts(params)
      .then(r => { setProducts(r.products); setTotal(r.total); })
      .catch((): void => { setError('Failed to load products.'); })
      .finally((): void => { setLoading(false); });
  }, [page, search, categoryFilter, statusFilter]);

  function handleSearch(): void {
    setPage(1);
    setSearch(searchInput.trim());
  }

  function handleFilterChange(): void {
    setPage(1);
  }

  async function handleToggle(product: Product): Promise<void> {
    setToggling(product.id);
    try {
      const updated = await toggleProduct(product.id);
      setProducts(prev => prev.map(p => p.id === updated.id ? { ...p, isActive: updated.isActive } : p));
      toast.success(updated.isActive ? 'Product activated' : 'Product deactivated');
    } catch {
      toast.error('Failed to update status');
    } finally {
      setToggling(null);
    }
  }

  function handleToggled(updated: Product): void {
    setProducts(prev => prev.map(p => p.id === updated.id ? { ...p, isActive: updated.isActive } : p));
  }

  function handleDeleted(id: string): void {
    setProducts(prev => prev.filter(p => p.id !== id));
    setTotal(t => t - 1);
    setDeleteTarget(null);
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Products</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} total</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex flex-1 min-w-48 gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search products…"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Search
          </button>
        </div>

        <div className="relative">
          <select
            value={categoryFilter}
            onChange={e => { setCategoryFilter(e.target.value ? Number(e.target.value) : ''); handleFilterChange(); }}
            className="appearance-none pl-3 pr-8 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        </div>

        <div className="relative">
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value as '' | 'true' | 'false'); handleFilterChange(); }}
            className="appearance-none pl-3 pr-8 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        </div>
      </div>

      {/* Table */}
      {error ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Seller</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Stock</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Active</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center">
                      <Loader2 className="w-5 h-5 text-gray-400 animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center">
                      <Package className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">No products found</p>
                    </td>
                  </tr>
                ) : products.map(product => (
                  <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                    {/* Product */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {product.images.length > 0 ? (
                          <ThumbnailImage src={imgUrl(product.images[0])} alt={product.name} />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-100 shrink-0 flex items-center justify-center">
                            <Package className="w-4 h-4 text-gray-300" />
                          </div>
                        )}
                        <span className="font-medium text-gray-900 max-w-48 truncate" title={product.name}>
                          {product.name}
                        </span>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3 text-gray-600">
                      {product.category?.name ?? '—'}
                    </td>

                    {/* Seller */}
                    <td className="px-4 py-3 text-gray-600 max-w-36 truncate">
                      {product.seller?.sellerProfile?.businessName ?? product.seller?.fullName ?? '—'}
                    </td>

                    {/* Price */}
                    <td className="px-4 py-3 text-right">
                      <span className="font-medium text-gray-900">{formatPrice(product.sellingPrice)}</span>
                      {product.mrp && Number(product.mrp) > Number(product.sellingPrice) && (
                        <span className="block text-xs text-gray-400 line-through">{formatPrice(product.mrp)}</span>
                      )}
                    </td>

                    {/* Stock */}
                    <td className="px-4 py-3 text-center">
                      <span className={`text-sm font-medium ${product.stock === 0 ? 'text-red-500' : 'text-gray-700'}`}>
                        {product.stock}
                      </span>
                    </td>

                    {/* Toggle */}
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        <ToggleSwitch
                          active={product.isActive}
                          onToggle={toggling === product.id ? (): void => {} : (): void => { void handleToggle(product); }}
                          title={`${product.isActive ? 'Deactivate' : 'Activate'} product`}
                        />
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={(): void => setDetailId(product.id)}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(): void => setDeleteTarget(product)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
            <span>
              {total === 0 ? '0 products' : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total}`}
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  disabled={page === 1}
                  onClick={(): void => setPage(p => p - 1)}
                  className="px-2 py-1 border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span>Page {page} of {totalPages}</span>
                <button
                  disabled={page === totalPages}
                  onClick={(): void => setPage(p => p + 1)}
                  className="px-2 py-1 border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {detailId !== null && (
        <ProductDetail
          productId={detailId}
          onClose={(): void => setDetailId(null)}
          onToggled={handleToggled}
          onDeleted={(id): void => { handleDeleted(id); setDetailId(null); }}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          product={deleteTarget}
          onClose={(): void => setDeleteTarget(null)}
          onDeleted={handleDeleted}
        />
      )}
    </>
  );
}
