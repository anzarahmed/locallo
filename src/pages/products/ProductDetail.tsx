import { useState, useEffect, type JSX } from 'react';
import { X, Package, ToggleLeft, ToggleRight, Trash2, Loader2, Store, MapPin, Layers } from 'lucide-react';
import { getProduct, toggleProduct, deleteProduct } from '../../services/productService';
import { ApiError } from '../../lib/axios';
import type { AttributeField, Product, ProductVariant } from '../../types';
import { useToast } from '../../hooks/useToast';

interface ProductDetailProps {
  productId: string;
  onClose: () => void;
  onToggled: (product: Product) => void;
  onDeleted: (id: string) => void;
}

function imgUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${import.meta.env.VITE_API_URL as string}${path}`;
}

function formatPrice(val: number | string | null): string {
  if (val === null || val === undefined) return '—';
  return `₹${Number(val).toLocaleString('en-IN')}`;
}

function discountPct(selling: number | string | null, mrp: number | string | null): number | null {
  const s = Number(selling);
  const m = Number(mrp);
  if (!s || !m || m <= s) return null;
  return Math.round(((m - s) / m) * 100);
}

function renderAttrValue(field: AttributeField, raw: unknown): JSX.Element {
  if (raw === null || raw === undefined || raw === '') return <span className="text-gray-400">—</span>;

  if (field.type === 'color') {
    return <span className="text-xs bg-gray-100 text-gray-700 rounded-full px-2.5 py-1">{String(raw)}</span>;
  }

  if (field.type === 'multiselect' && Array.isArray(raw) && field.options) {
    const labels = (raw as string[]).map(v => field.options?.find(o => o.value === v)?.label ?? v);
    return (
      <div className="flex flex-wrap gap-1.5">
        {labels.map(l => (
          <span key={l} className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full px-2.5 py-0.5">{l}</span>
        ))}
      </div>
    );
  }

  if (field.type === 'select' && field.options) {
    const opt = field.options.find(o => o.value === raw);
    return <span className="text-xs bg-gray-100 text-gray-700 rounded-full px-2.5 py-1">{opt?.label ?? String(raw)}</span>;
  }

  return <span className="text-sm text-gray-800 whitespace-pre-wrap">{String(raw)}</span>;
}

function ProductImage({ src, alt }: { src: string; alt: string }): JSX.Element {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  return (
    <div className="aspect-square rounded-xl overflow-hidden bg-gray-100 relative">
      {status === 'loading' && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200" />
      )}
      {status === 'error' ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gray-50">
          <Package className="w-10 h-10 text-gray-300" />
          <p className="text-xs text-gray-400">Image unavailable</p>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          onLoad={(): void => setStatus('loaded')}
          onError={(): void => setStatus('error')}
          className={`w-full h-full object-cover transition-opacity duration-200 ${status === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
    </div>
  );
}

function ThumbImage({ src }: { src: string }): JSX.Element {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  return (
    <div className="w-full h-full relative">
      {status === 'loading' && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200" />
      )}
      {status === 'error' ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
          <Package className="w-4 h-4 text-gray-300" />
        </div>
      ) : (
        <img
          src={src}
          alt=""
          onLoad={(): void => setStatus('loaded')}
          onError={(): void => setStatus('error')}
          className={`w-full h-full object-cover transition-opacity duration-150 ${status === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
    </div>
  );
}

function Skeleton({ className }: { className: string }): JSX.Element {
  return <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />;
}

function ProductSkeleton(): JSX.Element {
  return (
    <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-gray-100">
      <div className="md:w-64 shrink-0 p-5 space-y-3">
        <Skeleton className="aspect-square rounded-xl" />
        <div className="flex gap-2">
          <Skeleton className="w-12 h-12" />
          <Skeleton className="w-12 h-12" />
          <Skeleton className="w-12 h-12" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-10 rounded-xl" />
        <Skeleton className="h-10 rounded-xl" />
      </div>
      <div className="flex-1 p-5 space-y-5">
        <div className="space-y-2">
          <Skeleton className="h-6 w-2/3 rounded" />
          <Skeleton className="h-3 w-1/3 rounded" />
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
        <Skeleton className="h-5 w-32 rounded" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-24 rounded" />
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-5/6 rounded" />
          <Skeleton className="h-4 w-4/6 rounded" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-20 rounded" />
          <Skeleton className="h-14 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

function stockColor(stock: number): string {
  if (stock === 0) return 'text-red-600';
  if (stock <= 5) return 'text-amber-600';
  return 'text-gray-900';
}

function variantLabel(variant: ProductVariant, schema: AttributeField[]): string {
  if (schema.length === 0) return Object.values(variant.attributes).filter(Boolean).join(', ') || `Variant`;
  return schema
    .map(f => {
      const v = variant.attributes[f.key];
      if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) return null;
      if (f.type === 'select' && f.options) {
        const vals = Array.isArray(v) ? (v as string[]) : [v as string];
        return vals.map(val => f.options?.find(o => o.value === val)?.label ?? val).join(', ');
      }
      if (f.type === 'multiselect' && Array.isArray(v) && f.options) {
        return (v as string[]).map(val => f.options?.find(o => o.value === val)?.label ?? val).join(', ');
      }
      return String(v);
    })
    .filter(Boolean)
    .join(' · ') || 'Variant';
}

interface VariantsSectionProps {
  variants: ProductVariant[];
  schema: AttributeField[];
}

function VariantsSection({ variants, schema }: VariantsSectionProps): JSX.Element {
  const outOfStock  = variants.filter(v => v.stock === 0).length;
  const lowStock    = variants.filter(v => v.stock > 0 && v.stock <= 5).length;
  const totalStock  = variants.reduce((sum, v) => sum + v.stock, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-2.5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
          Variants
          <span className="ml-1.5 text-gray-500 font-normal normal-case tracking-normal">({variants.length})</span>
        </p>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          {outOfStock > 0 && (
            <span className="text-red-500 font-medium">{outOfStock} out</span>
          )}
          {lowStock > 0 && (
            <span className="text-amber-500 font-medium">{lowStock} low</span>
          )}
          <span className="text-gray-500">{totalStock} total units</span>
        </div>
      </div>

      <div className="rounded-xl border border-gray-100 overflow-hidden">
        {/* Sticky header */}
        <div className="flex items-center justify-between px-3.5 py-2 bg-gray-50 border-b border-gray-100">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Variant</span>
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Stock</span>
        </div>

        {/* Scrollable rows */}
        <div className="overflow-y-auto divide-y divide-gray-50" style={{ maxHeight: '280px' }}>
          {variants.map((v, i) => (
            <div key={v.id} className="flex items-center justify-between px-3.5 py-2.5 bg-white hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="shrink-0 w-5 h-5 rounded-full bg-gray-100 text-gray-400 text-xs font-medium flex items-center justify-center leading-none">
                  {i + 1}
                </span>
                <span className="text-sm text-gray-700 truncate">{variantLabel(v, schema)}</span>
                {!v.isActive && (
                  <span className="shrink-0 text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">Inactive</span>
                )}
              </div>
              <div className="shrink-0 ml-3 text-right">
                <span className={`text-sm font-semibold ${stockColor(v.stock)}`}>{v.stock}</span>
                <span className="text-xs text-gray-400 ml-1">units</span>
                {v.stock === 0 && <span className="block text-xs font-medium text-red-400 leading-none mt-0.5">Out of stock</span>}
                {v.stock > 0 && v.stock <= 5 && <span className="block text-xs font-medium text-amber-400 leading-none mt-0.5">Low stock</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ProductDetail({ productId, onClose, onToggled, onDeleted }: ProductDetailProps): JSX.Element {
  const toast = useToast();
  const [product, setProduct]     = useState<Product | null>(null);
  const [loading, setLoading]     = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [toggling, setToggling]   = useState(false);
  const [deleting, setDeleting]   = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect((): void => {
    setLoading(true);
    getProduct(productId)
      .then(p => { setProduct(p); setActiveImg(0); })
      .catch((): void => { toast.error('Failed to load product'); onClose(); })
      .finally((): void => { setLoading(false); });
  }, [productId]);

  async function handleToggle(): Promise<void> {
    if (!product) return;
    setToggling(true);
    try {
      const updated = await toggleProduct(product.id);
      setProduct(p => p ? { ...p, isActive: updated.isActive } : p);
      onToggled(updated);
      toast.success(updated.isActive ? 'Product activated' : 'Product deactivated');
    } catch {
      toast.error('Failed to update status');
    } finally {
      setToggling(false);
    }
  }

  async function handleDelete(): Promise<void> {
    if (!product) return;
    setDeleting(true);
    try {
      await deleteProduct(product.id);
      toast.success('Product deleted');
      onDeleted(product.id);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.message : 'Failed to delete';
      toast.error(message);
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  const discount = product ? discountPct(product.sellingPrice, product.mrp) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="min-w-0 pr-4">
            <h2 className="text-sm font-semibold text-gray-900 truncate">
              {loading ? 'Loading…' : (product?.name ?? 'Product Detail')}
            </h2>
            {!loading && product?.category && (
              <p className="text-xs text-gray-400 mt-0.5">{product.category.name}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <ProductSkeleton />
          ) : !product ? null : (
            <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-gray-100">

              {/* Left — images + actions */}
              <div className="md:w-64 shrink-0 p-5 space-y-3">
                {product.images.length > 0 ? (
                  <>
                    <ProductImage src={imgUrl(product.images[activeImg])} alt={product.name} />
                    {product.images.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {product.images.map((img, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={(): void => setActiveImg(i)}
                            className={`shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                              i === activeImg
                                ? 'border-indigo-500 ring-2 ring-indigo-100'
                                : 'border-transparent hover:border-gray-300'
                            }`}
                          >
                            <ThumbImage src={imgUrl(img)} />
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="aspect-square rounded-xl bg-gray-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2">
                    <Package className="w-10 h-10 text-gray-300" />
                    <p className="text-xs text-gray-400">No images</p>
                  </div>
                )}

                {/* Status */}
                <div>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                    product.isActive
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-gray-50 text-gray-500 border-gray-200'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${product.isActive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                    {product.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* Actions */}
                {!confirmDelete ? (
                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      onClick={(): void => { void handleToggle(); }}
                      disabled={toggling}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-60 transition-colors"
                    >
                      {toggling
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : product.isActive
                          ? <ToggleLeft className="w-4 h-4 text-gray-500" />
                          : <ToggleRight className="w-4 h-4 text-indigo-500" />
                      }
                      <span className={product.isActive ? 'text-gray-700' : 'text-indigo-700'}>
                        {product.isActive ? 'Deactivate' : 'Activate'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={(): void => setConfirmDelete(true)}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium text-red-600 border border-red-100 rounded-xl hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                ) : (
                  <div className="rounded-xl border border-red-100 bg-red-50 p-3 space-y-2.5">
                    <p className="text-xs text-red-700 font-medium">Delete this product? This cannot be undone.</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={(): void => setConfirmDelete(false)}
                        className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={(): void => { void handleDelete(); }}
                        disabled={deleting}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-60 transition-colors"
                      >
                        {deleting && <Loader2 className="w-3 h-3 animate-spin" />}
                        Confirm
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Right — details */}
              <div className="flex-1 p-5 space-y-5 min-w-0">

                {/* Name + date */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 leading-snug">{product.name}</h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Added {new Date(product.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>

                {/* Pricing */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-3">
                    <p className="text-xs text-indigo-400 font-medium mb-1">Selling Price</p>
                    <p className="text-base font-bold text-indigo-700 leading-none">{formatPrice(product.sellingPrice)}</p>
                    {discount !== null && (
                      <span className="mt-1.5 inline-block text-xs font-semibold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                        -{discount}% off
                      </span>
                    )}
                  </div>
                  <div className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-3">
                    <p className="text-xs text-gray-400 mb-1">MRP</p>
                    <p className={`text-sm font-semibold leading-none ${discount !== null ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                      {formatPrice(product.mrp)}
                    </p>
                  </div>
                  <div className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-3">
                    <p className="text-xs text-gray-400 mb-1">Cost Price</p>
                    <p className="text-sm font-semibold text-gray-700 leading-none">{formatPrice(product.costPrice)}</p>
                  </div>
                </div>

                {/* Stock */}
                <div className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-500">
                    {product.variants && product.variants.length > 0 ? 'Total stock:' : 'Stock:'}
                  </span>
                  <span className={`text-sm font-semibold ${
                    product.stock === 0
                      ? 'text-red-600'
                      : product.stock <= 5
                        ? 'text-amber-600'
                        : 'text-gray-900'
                  }`}>
                    {product.stock} units
                    {product.stock === 0 && <span className="ml-1 text-xs font-medium text-red-500">(Out of stock)</span>}
                    {product.stock > 0 && product.stock <= 5 && <span className="ml-1 text-xs font-medium text-amber-500">(Low stock)</span>}
                  </span>
                </div>

                {/* Variants */}
                {product.variants && product.variants.length > 0 && (
                  <VariantsSection
                    variants={product.variants}
                    schema={product.category?.attributeSchema ?? []}
                  />
                )}

                {/* Description */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Description</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{product.description}</p>
                </div>

                {/* Dynamic attributes */}
                {product.category?.attributeSchema && product.category.attributeSchema.length > 0 && (() => {
                  const visible = product.category!.attributeSchema.filter(f => {
                    const v = product.attributes[f.key];
                    return v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0);
                  });
                  if (visible.length === 0) return null;
                  return (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Attributes</p>
                      <dl className="space-y-3">
                        {visible.map(field => (
                          <div key={field.key} className="flex items-start gap-3">
                            <dt className="text-xs text-gray-400 w-28 shrink-0 pt-0.5 leading-relaxed">{field.label}</dt>
                            <dd className="flex-1">{renderAttrValue(field, product.attributes[field.key])}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  );
                })()}

                {/* Seller */}
                {product.seller && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Seller</p>
                    <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                        <Store className="w-4 h-4 text-indigo-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {product.seller.sellerProfile?.businessName ?? product.seller.fullName ?? '—'}
                        </p>
                        <p className="text-xs text-gray-400">{product.seller.mobile}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Pickup */}
                {product.pickupAddress && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Pickup Location</p>
                    <div className="flex items-start gap-3 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm text-gray-700">{product.pickupAddress}</p>
                        {product.pickupLat && product.pickupLong && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {Number(product.pickupLat).toFixed(4)}, {Number(product.pickupLong).toFixed(4)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
