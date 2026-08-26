import { useEffect, useState, type JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Eye, EyeOff, Layers, Pencil, Trash2, Star, Heart, ChevronDown, ScanEye, ShoppingBag, Loader2, Rocket } from 'lucide-react';
import { getProducts, toggleProduct, deleteProduct, markProductSold, markVariantSold, getProductVariants } from '../../services/sellerService';
import { useToast } from '../../hooks/useToast';
import { ApiError } from '../../lib/axios';
import { resolveImage } from '../../lib/imageUtils';
import { hasDiscount } from '../../lib/formatters';
import { FILTER_TABS, SORT_OPTIONS, PAGE_LIMIT, type FilterTab } from '../../constants';
import ConfirmDeleteModal from '../../components/ui/ConfirmDeleteModal';
import SellModal from '../../components/ui/SellModal';
import VariantPickerModal from '../../components/ui/VariantPickerModal';
import BoostProductModal from '../../components/ui/BoostProductModal';
import type { Product, ProductVariant, AttributeField } from '../../types';
import ProductPreview from './ProductPreview';

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
  const [previewId, setPreviewId] = useState<string | null>(null);

  const [sellProduct, setSellProduct] = useState<Product | null>(null);
  const [variantPickerData, setVariantPickerData] = useState<{
    product: Product;
    variants: ProductVariant[];
    schema: AttributeField[];
  } | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [loadingVariantsForId, setLoadingVariantsForId] = useState<string | null>(null);
  const [selling, setSelling] = useState(false);
  const [boostProduct, setBoostProduct] = useState<Product | null>(null);

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

  async function handleSellClick(product: Product): Promise<void> {
    if ((product.variantCount ?? 0) > 0) {
      setLoadingVariantsForId(product.id);
      try {
        const data = await getProductVariants(product.id);
        setVariantPickerData({
          product,
          variants: data.variants,
          schema: data.product.category?.attributeSchema ?? [],
        });
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Failed to load variants');
      } finally {
        setLoadingVariantsForId(null);
      }
    } else {
      setSellProduct(product);
    }
  }

  function handleVariantSelected(variant: ProductVariant): void {
    setSelectedVariant(variant);
    setVariantPickerData(null);
  }

  async function handleConfirmProductSell(quantity: number): Promise<void> {
    if (!sellProduct) return;
    setSelling(true);
    try {
      await markProductSold(sellProduct.id, quantity);
      setProducts(prev =>
        prev.map(p => p.id === sellProduct.id ? { ...p, stock: p.stock - quantity } : p),
      );
      toast.success(`Marked ${quantity} unit${quantity !== 1 ? 's' : ''} as sold`);
      setSellProduct(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to record sale');
    } finally {
      setSelling(false);
    }
  }

  async function handleConfirmVariantSell(quantity: number): Promise<void> {
    if (!selectedVariant) return;
    const productId = selectedVariant.productId;
    setSelling(true);
    try {
      await markVariantSold(productId, selectedVariant.id, quantity);
      setProducts(prev =>
        prev.map(p => {
          if (p.id !== productId) return p;
          return { ...p, stock: Math.max(0, p.stock - quantity) };
        }),
      );
      toast.success(`Marked ${quantity} unit${quantity !== 1 ? 's' : ''} as sold`);
      setSelectedVariant(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to record sale');
    } finally {
      setSelling(false);
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
                loadingVariants={loadingVariantsForId === product.id}
                onEdit={() => navigate(`/products/${product.id}/edit`)}
                onVariants={() => navigate(`/products/${product.id}/variants`)}
                onToggle={() => void handleToggle(product)}
                onDelete={() => setDeleteTarget(product)}
                onPreview={() => setPreviewId(product.id)}
                onSell={() => void handleSellClick(product)}
                onPromote={() => setBoostProduct(product)}
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
        <ConfirmDeleteModal
          title="Delete Product"
          message={
            <>
              Are you sure you want to delete{' '}
              <span className="font-semibold text-gray-700">{deleteTarget.name}</span>?{' '}
              This cannot be undone.
            </>
          }
          loading={deleting}
          onConfirm={() => void confirmDelete()}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {previewId && (
        <ProductPreview
          productId={previewId}
          onClose={() => setPreviewId(null)}
        />
      )}

      {variantPickerData && (
        <VariantPickerModal
          productName={variantPickerData.product.name}
          variants={variantPickerData.variants}
          schema={variantPickerData.schema}
          onSelect={handleVariantSelected}
          onClose={() => setVariantPickerData(null)}
        />
      )}

      {selectedVariant && (
        <SellModal
          itemName={
            Object.values(selectedVariant.attributes).join(' / ') || 'Variant'
          }
          currentStock={selectedVariant.stock}
          loading={selling}
          onConfirm={(qty) => void handleConfirmVariantSell(qty)}
          onClose={() => setSelectedVariant(null)}
        />
      )}

      {sellProduct && (
        <SellModal
          itemName={sellProduct.name}
          currentStock={sellProduct.stock}
          loading={selling}
          onConfirm={(qty) => void handleConfirmProductSell(qty)}
          onClose={() => setSellProduct(null)}
        />
      )}

      {boostProduct && (
        <BoostProductModal
          product={boostProduct}
          onClose={() => setBoostProduct(null)}
          onBoosted={() => {}}
        />
      )}
    </div>
  );
}

/* ── Product card ── */
interface ProductCardProps {
  product: Product;
  loadingVariants: boolean;
  onEdit: () => void;
  onVariants: () => void;
  onToggle: () => void;
  onDelete: () => void;
  onPreview: () => void;
  onSell: () => void;
  onPromote: () => void;
}

function ProductCard({ product, loadingVariants, onEdit, onVariants, onToggle, onDelete, onPreview, onSell, onPromote }: ProductCardProps): JSX.Element {
  const [imgError, setImgError] = useState(false);
  const thumbnailSrc = product.thumbnails?.[0] ?? product.images?.[0];
  const imageUrl = thumbnailSrc ? resolveImage(thumbnailSrc) : null;

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
          {hasDiscount(product.mrp, product.sellingPrice) && (
            <span className="text-xs text-gray-400 line-through">
              ₹{product.mrp!.toLocaleString('en-IN')}
            </span>
          )}
        </div>

        <button
          onClick={onPromote}
          className="flex items-center gap-1 px-2.5 h-7 rounded-full bg-violet-600 text-white text-[11px] font-semibold leading-none hover:bg-violet-700 transition-colors shrink-0"
        >
          <Rocket size={12} />
          Promote
        </button>
      </div>

      <div className="flex items-center justify-end gap-2 mt-2">
        <button
          onClick={onSell}
          disabled={loadingVariants || product.stock === 0}
          title={product.stock === 0 ? 'Out of stock' : 'Mark as sold'}
          className="w-9 h-9 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 hover:bg-teal-100 transition-colors disabled:opacity-40"
        >
          {loadingVariants ? <Loader2 size={15} className="animate-spin" /> : <ShoppingBag size={15} />}
        </button>
        <button
          onClick={onPreview}
          title="Customer preview"
          className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 hover:bg-amber-100 transition-colors"
        >
          <ScanEye size={15} />
        </button>
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
  );
}

/* ── Card skeleton ── */
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
