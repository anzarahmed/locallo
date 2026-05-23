import { useState, useEffect, type JSX } from 'react';
import { X, Loader2, Package, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import { getProduct, toggleProduct, deleteProduct } from '../../services/productService';
import { ApiError } from '../../lib/axios';
import type { AttributeField, AttributeFieldOption, Product } from '../../types';
import { useToast } from '../../hooks/useToast';

interface ProductDetailProps {
  productId: number;
  onClose: () => void;
  onToggled: (product: Product) => void;
  onDeleted: (id: number) => void;
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

function renderAttrValue(field: AttributeField, raw: unknown): JSX.Element {
  if (raw === null || raw === undefined || raw === '') return <span className="text-gray-400">—</span>;

  if (field.type === 'color' && Array.isArray(raw) && field.options) {
    const matched = (raw as string[])
      .map(v => field.options?.find(o => o.value === v))
      .filter((o): o is AttributeFieldOption => Boolean(o));
    return (
      <div className="flex flex-wrap gap-1.5">
        {matched.map(o => (
          <span key={o.value} className="flex items-center gap-1 text-xs text-gray-700">
            {o.hex && <span className="w-3.5 h-3.5 rounded-full border border-gray-200 shrink-0" style={{ backgroundColor: o.hex }} />}
            {o.label}
          </span>
        ))}
      </div>
    );
  }

  if ((field.type === 'multiselect') && Array.isArray(raw) && field.options) {
    const labels = (raw as string[]).map(v => field.options?.find(o => o.value === v)?.label ?? v);
    return <span className="text-sm text-gray-800">{labels.join(', ')}</span>;
  }

  if (field.type === 'select' && field.options) {
    const opt = field.options.find(o => o.value === raw);
    return <span className="text-sm text-gray-800">{opt?.label ?? String(raw)}</span>;
  }

  return <span className="text-sm text-gray-800 whitespace-pre-wrap">{String(raw)}</span>;
}

export default function ProductDetail({ productId, onClose, onToggled, onDeleted }: ProductDetailProps): JSX.Element {
  const toast = useToast();
  const [product, setProduct]   = useState<Product | null>(null);
  const [loading, setLoading]   = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">Product Detail</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
            </div>
          ) : !product ? null : (
            <div className="flex flex-col md:flex-row gap-0 divide-y md:divide-y-0 md:divide-x divide-gray-100">
              {/* Left — images */}
              <div className="md:w-72 shrink-0 p-5 space-y-3">
                {product.images.length > 0 ? (
                  <>
                    <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                      <img
                        src={imgUrl(product.images[activeImg])}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {product.images.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {product.images.map((img, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={(): void => setActiveImg(i)}
                            className={`shrink-0 w-14 h-14 rounded-md overflow-hidden border-2 transition-colors ${
                              i === activeImg ? 'border-indigo-500' : 'border-transparent'
                            }`}
                          >
                            <img src={imgUrl(img)} alt="" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="aspect-square rounded-lg bg-gray-100 flex items-center justify-center">
                    <Package className="w-12 h-12 text-gray-300" />
                  </div>
                )}

                {/* Status */}
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                    product.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                  }`}>
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
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-60 transition-colors"
                    >
                      {toggling
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : product.isActive
                        ? <ToggleLeft className="w-4 h-4" />
                        : <ToggleRight className="w-4 h-4" />
                      }
                      {product.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      type="button"
                      onClick={(): void => setConfirmDelete(true)}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Product
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 pt-1">
                    <p className="text-xs text-gray-600">Delete this product? This cannot be undone.</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={(): void => setConfirmDelete(false)}
                        className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={(): void => { void handleDelete(); }}
                        disabled={deleting}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-60 transition-colors"
                      >
                        {deleting && <Loader2 className="w-3 h-3 animate-spin" />}
                        Confirm
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Right — details */}
              <div className="flex-1 p-5 space-y-5">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 leading-tight">{product.name}</h3>
                  {product.category && (
                    <p className="text-sm text-gray-500 mt-0.5">{product.category.name}</p>
                  )}
                </div>

                {/* Pricing */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-gray-50 rounded-lg px-3 py-2.5">
                    <p className="text-xs text-gray-500 mb-0.5">Selling Price</p>
                    <p className="text-sm font-bold text-gray-900">{formatPrice(product.sellingPrice)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg px-3 py-2.5">
                    <p className="text-xs text-gray-500 mb-0.5">MRP</p>
                    <p className="text-sm font-medium text-gray-700">{formatPrice(product.mrp)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg px-3 py-2.5">
                    <p className="text-xs text-gray-500 mb-0.5">Cost Price</p>
                    <p className="text-sm font-medium text-gray-700">{formatPrice(product.costPrice)}</p>
                  </div>
                </div>

                {/* Stock */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Stock:</span>
                  <span className={`text-sm font-semibold ${product.stock === 0 ? 'text-red-600' : 'text-gray-900'}`}>
                    {product.stock} units
                  </span>
                </div>

                {/* Description */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Description</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{product.description}</p>
                </div>

                {/* Dynamic attributes */}
                {product.category?.attributeSchema && product.category.attributeSchema.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Attributes</p>
                    <dl className="space-y-2">
                      {product.category.attributeSchema.map(field => {
                        const val = product.attributes[field.key];
                        if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) return null;
                        return (
                          <div key={field.key} className="flex gap-3">
                            <dt className="text-xs text-gray-500 w-32 shrink-0 pt-0.5">{field.label}</dt>
                            <dd className="flex-1">{renderAttrValue(field, val)}</dd>
                          </div>
                        );
                      })}
                    </dl>
                  </div>
                )}

                {/* Seller */}
                {product.seller && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Seller</p>
                    <p className="text-sm font-medium text-gray-900">
                      {product.seller.sellerProfile?.businessName ?? product.seller.fullName ?? '—'}
                    </p>
                    <p className="text-xs text-gray-500">{product.seller.mobile}</p>
                  </div>
                )}

                {/* Pickup */}
                {product.pickupAddress && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Pickup Location</p>
                    <p className="text-sm text-gray-700">{product.pickupAddress}</p>
                    {product.pickupLat && product.pickupLong && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {Number(product.pickupLat).toFixed(4)}, {Number(product.pickupLong).toFixed(4)}
                      </p>
                    )}
                  </div>
                )}

                <p className="text-xs text-gray-400">
                  Added {new Date(product.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
