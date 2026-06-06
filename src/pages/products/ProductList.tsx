import { useEffect, useState, type JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Eye, EyeOff, Layers, Pencil, Trash2, Star, Heart, ChevronDown } from 'lucide-react';
import { getProducts, toggleProduct, deleteProduct } from '../../services/sellerService';
import { useToast } from '../../hooks/useToast';
import { ApiError } from '../../lib/axios';
import type { Product } from '../../types';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
const PAGE_LIMIT = 20;

type FilterTab = 'all' | 'visible' | 'hidden';

const FILTER_TABS: { value: FilterTab; label: string }[] = [
  { value: 'all',     label: 'All'     },
  { value: 'visible', label: 'Visible' },
  { value: 'hidden',  label: 'Hidden'  },
];

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'sort_newest',         label: 'Newest'            },
  { value: 'sort_price_high_low', label: 'Price: High → Low' },
  { value: 'sort_price_low_high', label: 'Price: Low → High' },
  { value: 'sort_stock_high_low', label: 'Stock: High → Low' },
  { value: 'sort_stock_low_high', label: 'Stock: Low → High' },
  { value: 'sort_name_az',        label: 'Name: A–Z'         },
];

function resolveImage(url: string): string {
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url}`;
}

export default function ProductList(): JSX.Element {
  const navigate = useNavigate();
  const toast = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [sortBy, setSortBy] = useState('sort_newest');
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const data = await getProducts({ page, limit: PAGE_LIMIT, filter, sortBy });
        setProducts(data.products);
        setTotal(data.total);
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Failed to load products');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [page, filter, sortBy]); // toast is stable

  function handleFilterChange(f: FilterTab): void {
    setFilter(f);
    setPage(1);
  }

  function handleSortChange(s: string): void {
    setSortBy(s);
    setPage(1);
  }

  async function handleToggle(product: Product): Promise<void> {
    try {
      await toggleProduct(product.id);
      setProducts(prev =>
        prev.map(p => p.id === product.id ? { ...p, isActive: !p.isActive } : p),
      );
      toast.success(product.isActive ? 'Product hidden' : 'Product is now visible');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to update product');
    }
  }

  async function confirmDelete(): Promise<void> {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteProduct(deleteTarget.id);
      setProducts(prev => prev.filter(p => p.id !== deleteTarget.id));
      setTotal(t => t - 1);
      setDeleteTarget(null);
      toast.success('Product deleted');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to delete product');
    } finally {
      setDeleting(false);
    }
  }

  const totalPages = Math.ceil(total / PAGE_LIMIT);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Teal header — full width */}
      <div
        className="px-6 md:px-8 pt-8 pb-16"
        style={{
          background: 'linear-gradient(150deg, #26B8B2 0%, #1A9E98 45%, #14817C 100%)',
          borderRadius: '0 0 28px 28px',
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white text-2xl font-bold leading-tight">My Products</h1>
            {!loading && (
              <p className="text-white/70 text-sm mt-1">
                {total} product{total !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <button
            onClick={() => navigate('/products/add')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/20 text-white text-sm font-semibold hover:bg-white/30 transition-colors"
          >
            + Add Product
          </button>
        </div>
      </div>

      {/* Content — full width, overlapping header */}
      <div className="px-6 md:px-8 -mt-8 relative z-10 pb-8">

        {/* Filter + sort bar */}
        <div className="bg-white rounded-2xl shadow-sm px-4 py-3 mb-4 flex flex-wrap items-center gap-3">
          <div className="flex gap-2">
            {FILTER_TABS.map(tab => (
              <button
                key={tab.value}
                onClick={() => handleFilterChange(tab.value)}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                  filter === tab.value
                    ? 'bg-teal-600 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="hidden md:block h-5 w-px bg-gray-200" />

          <div className="flex items-center gap-2 ml-auto">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide shrink-0">
              Sort
            </span>
            <div className="relative">
              <select
                value={sortBy}
                onChange={e => handleSortChange(e.target.value)}
                className="appearance-none border border-gray-200 rounded-xl text-sm text-gray-700 px-3 py-2 pr-8 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer"
              >
                {SORT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
            </div>
          </div>
        </div>

        {/* Product grid — 1 col mobile, 2 cols desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <ProductCardSkeleton key={i} />)
          ) : products.length === 0 ? (
            <div className="col-span-full">
              <EmptyState filter={filter} onAdd={() => navigate('/products/add')} />
            </div>
          ) : (
            products.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                onEdit={() => navigate(`/products/${product.id}/edit`)}
                onVariants={() => navigate(`/products/${product.id}/variants`)}
                onToggle={() => void handleToggle(product)}
                onDelete={() => setDeleteTarget(product)}
              />
            ))
          )}
        </div>

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

      {deleteTarget && (
        <DeleteModal
          productName={deleteTarget.name}
          loading={deleting}
          onConfirm={() => void confirmDelete()}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

/* ── Product card ── */
interface ProductCardProps {
  product: Product;
  onEdit: () => void;
  onVariants: () => void;
  onToggle: () => void;
  onDelete: () => void;
}

function ProductCard({ product, onEdit, onVariants, onToggle, onDelete }: ProductCardProps): JSX.Element {
  const [imgError, setImgError] = useState(false);
  const imageUrl = product.images?.[0] ? resolveImage(product.images[0]) : null;
  const hasDiscount = product.mrp != null && product.mrp > product.sellingPrice;

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <div className="flex gap-3">
        <div className="w-20 h-20 rounded-xl bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
          {imageUrl && !imgError ? (
            <img
              src={imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <Package size={24} className="text-gray-300" />
          )}
        </div>

        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-start gap-2">
            <p className="text-sm font-semibold text-gray-800 leading-snug line-clamp-2 flex-1">
              {product.name}
            </p>
            {!product.isActive && (
              <span className="shrink-0 text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full mt-0.5">
                Hidden
              </span>
            )}
          </div>

          <p className="text-xs text-gray-400 mt-1">{product.category?.name ?? '—'}</p>

          <div className="flex items-center gap-2.5 mt-1.5">
            <span className="flex items-center gap-0.5 text-xs text-gray-400">
              <Star size={11} className="text-amber-400 fill-amber-400" />
              0
            </span>
            <span className="flex items-center gap-0.5 text-xs text-gray-400">
              <Heart size={11} className="text-pink-400" />
              0
            </span>
            <span className="text-xs text-gray-400">Stock: {product.stock}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
        <div className="flex items-baseline gap-2">
          <span className="text-base font-bold text-teal-600">
            ₹{product.sellingPrice.toLocaleString('en-IN')}
          </span>
          {hasDiscount && (
            <span className="text-xs text-gray-400 line-through">
              ₹{product.mrp!.toLocaleString('en-IN')}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggle}
            title={product.isActive ? 'Hide product' : 'Show product'}
            className="w-9 h-9 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 hover:bg-teal-100 transition-colors"
          >
            {product.isActive ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
          <button
            onClick={onEdit}
            title="Edit product"
            className="w-9 h-9 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 hover:bg-teal-100 transition-colors"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={onVariants}
            title="Manage variants"
            className="w-9 h-9 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 hover:bg-teal-100 transition-colors"
          >
            <Layers size={15} />
          </button>
          <button
            onClick={onDelete}
            title="Delete product"
            className="w-9 h-9 rounded-full bg-rose-50 flex items-center justify-center text-rose-400 hover:bg-rose-100 transition-colors"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Card skeleton (mobile) ── */
function ProductCardSkeleton(): JSX.Element {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 animate-pulse">
      <div className="flex gap-3">
        <div className="w-20 h-20 rounded-xl bg-gray-100 shrink-0" />
        <div className="flex-1 pt-0.5">
          <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
          <div className="h-3 bg-gray-100 rounded w-1/3 mb-2" />
          <div className="h-3 bg-gray-100 rounded w-1/2" />
        </div>
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
        <div className="h-5 bg-gray-100 rounded w-20" />
        <div className="flex gap-2">
          <div className="w-9 h-9 rounded-full bg-gray-100" />
          <div className="w-9 h-9 rounded-full bg-gray-100" />
          <div className="w-9 h-9 rounded-full bg-gray-100" />
        </div>
      </div>
    </div>
  );
}

/* ── Empty state ── */
interface EmptyStateProps {
  filter: FilterTab;
  onAdd: () => void;
}

function EmptyState({ filter, onAdd }: EmptyStateProps): JSX.Element {
  const message =
    filter === 'visible' ? 'No visible products'
    : filter === 'hidden' ? 'No hidden products'
    : 'No products yet';

  return (
    <div className="py-16 text-center">
      <Package size={40} className="text-gray-200 mx-auto mb-3" />
      <p className="text-sm font-semibold text-gray-500">{message}</p>
      {filter === 'all' && (
        <button
          onClick={onAdd}
          className="mt-3 text-sm font-semibold text-teal-600 hover:text-teal-700"
        >
          Add your first product
        </button>
      )}
    </div>
  );
}

/* ── Delete modal ── */
interface DeleteModalProps {
  productName: string;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteModal({ productName, loading, onConfirm, onCancel }: DeleteModalProps): JSX.Element {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
        <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4">
          <Trash2 size={20} className="text-rose-500" />
        </div>
        <h3 className="text-base font-bold text-gray-800 text-center mb-1">Delete Product</h3>
        <p className="text-sm text-gray-500 text-center mb-6">
          Are you sure you want to delete{' '}
          <span className="font-semibold text-gray-700">{productName}</span>?{' '}
          This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-rose-500 text-sm font-semibold text-white hover:bg-rose-600 transition-colors disabled:opacity-60"
          >
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
