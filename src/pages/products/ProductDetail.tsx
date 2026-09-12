import { useState, useEffect, type JSX, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Package, Pencil, Layers, ScanEye, Eye, EyeOff, Rocket,
  MapPin, TrendingUp, Star, Heart,
} from 'lucide-react';
import { getSellerProduct, getProductVariants } from '../../services/sellerService';
import { ApiError } from '../../lib/axios';
import { resolveImage } from '../../lib/imageUtils';
import { formatPrice, discountPct } from '../../lib/formatters';
import type { AttributeField, Product, ProductVariant } from '../../types';
import { categorySupportsVariants } from '../../lib/variantUtils';
import ProductPreview from './ProductPreview';

function renderAttrValue(field: AttributeField, raw: unknown): JSX.Element {
  if (raw === null || raw === undefined || raw === '') return <span className="text-gray-400">—</span>;

  if (field.type === 'color') {
    const opt = field.options?.find(o => o.value === raw);
    return <span className="text-xs bg-gray-100 text-gray-700 rounded-full px-2.5 py-1">{opt?.label ?? String(raw)}</span>;
  }

  if (field.type === 'multiselect' && Array.isArray(raw) && field.options) {
    const labels = (raw as string[]).map(v => field.options?.find(o => o.value === v)?.label ?? v);
    return (
      <div className="flex flex-wrap gap-1.5">
        {labels.map(l => (
          <span key={l} className="text-xs bg-teal-50 text-teal-700 border border-teal-100 rounded-full px-2.5 py-0.5">{l}</span>
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

function DetailImage({ src, alt }: { src: string; alt: string }): JSX.Element {
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
        <div className="absolute inset-0 animate-pulse bg-gray-200" />
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

function Card({ title, children }: { title?: string; children: ReactNode }): JSX.Element {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 md:p-5">
      {title && (
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">{title}</p>
      )}
      {children}
    </div>
  );
}

function stockTone(stock: number): string {
  if (stock === 0) return 'text-red-600';
  if (stock <= 5) return 'text-amber-600';
  return 'text-gray-900';
}

function variantLabel(variant: ProductVariant, schema: AttributeField[]): string {
  const fields = schema.filter(f => f.isVariant);
  const source = fields.length > 0 ? fields : schema;
  const parts = source
    .map(f => {
      const v = variant.attributes[f.key];
      if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) return null;
      if ((f.type === 'select' || f.type === 'multiselect') && f.options) {
        const vals = Array.isArray(v) ? (v as string[]) : [v as string];
        return vals.map(val => f.options?.find(o => o.value === val)?.label ?? val).join(', ');
      }
      return String(v);
    })
    .filter(Boolean);
  if (parts.length > 0) return parts.join(' · ');
  return Object.values(variant.attributes).filter(Boolean).join(' · ') || 'Variant';
}

function Skeleton(): JSX.Element {
  return (
    <div className="px-4 md:px-8 pt-5 max-w-3xl mx-auto space-y-4 animate-pulse">
      <div className="bg-white rounded-2xl shadow-sm p-5 flex flex-col md:flex-row gap-5">
        <div className="md:w-56 shrink-0 space-y-3">
          <div className="aspect-square rounded-xl bg-gray-200" />
          <div className="flex gap-2">
            <div className="w-12 h-12 rounded-lg bg-gray-200" />
            <div className="w-12 h-12 rounded-lg bg-gray-200" />
          </div>
        </div>
        <div className="flex-1 space-y-3">
          <div className="h-6 bg-gray-200 rounded w-2/3" />
          <div className="h-4 bg-gray-200 rounded w-1/3" />
          <div className="grid grid-cols-3 gap-2.5 pt-2">
            <div className="h-20 bg-gray-200 rounded-xl" />
            <div className="h-20 bg-gray-200 rounded-xl" />
            <div className="h-20 bg-gray-200 rounded-xl" />
          </div>
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm p-5 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-5/6" />
        <div className="h-4 bg-gray-200 rounded w-4/6" />
      </div>
    </div>
  );
}

export default function ProductDetail(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [product, setProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImg, setActiveImg] = useState(0);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    Promise.all([
      getSellerProduct(id),
      getProductVariants(id).catch(() => ({ variants: [] as ProductVariant[], product: null })),
    ])
      .then(([productRes, variantRes]) => {
        setProduct(productRes.product);
        setVariants(variantRes.variants);
        setActiveImg(0);
      })
      .catch(err => setError(err instanceof ApiError ? err.message : 'Failed to load product'))
      .finally(() => setLoading(false));
  }, [id]);

  const schema = product?.category?.attributeSchema ?? [];
  const showVariants = categorySupportsVariants(schema);
  const discount = product ? discountPct(product.sellingPrice, product.mrp) : null;

  const profit = product && product.costPrice != null ? product.sellingPrice - product.costPrice : null;
  const marginPct = profit != null && product && product.sellingPrice > 0
    ? Math.round((profit / product.sellingPrice) * 100)
    : null;

  const visibleAttrs = schema.filter(f => {
    if (f.isVariant) return false;
    const v = product?.attributes?.[f.key];
    return v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0);
  });

  const totalVariantStock = variants.reduce((sum, v) => sum + v.stock, 0);
  const outVariants = variants.filter(v => v.stock === 0).length;
  const lowVariants = variants.filter(v => v.stock > 0 && v.stock <= 5).length;

  return (
    <div className="min-h-screen bg-gray-100 pb-16">
      {/* Teal header */}
      <div
        className="px-5 md:px-8 pt-8 pb-6 flex items-center gap-4"
        style={{
          background: 'linear-gradient(150deg, #26B8B2 0%, #1A9E98 45%, #14817C 100%)',
          borderRadius: '0 0 28px 28px',
        }}
      >
        <button
          type="button"
          onClick={() => navigate('/products')}
          className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors shrink-0"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-white text-[20px] font-bold leading-tight truncate">
            {loading ? 'Product Details' : (product?.name ?? 'Product Details')}
          </h1>
          {!loading && product?.category && (
            <p className="text-white/70 text-sm truncate">{product.category.name}</p>
          )}
        </div>
        {!loading && product && (
          <span className="flex items-center gap-1.5 text-white/90 text-xs font-semibold bg-white/15 rounded-full px-3 py-1.5 shrink-0">
            <Eye size={13} />
            {product.viewCount ?? 0} views
          </span>
        )}
      </div>

      {loading ? (
        <Skeleton />
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <Package size={40} className="text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">{error}</p>
          <button
            onClick={() => navigate('/products')}
            className="mt-4 text-sm font-semibold text-teal-600 hover:text-teal-700"
          >
            Back to products
          </button>
        </div>
      ) : !product ? null : (
        <div className="px-4 md:px-8 pt-5 max-w-3xl mx-auto space-y-4">

          {/* Overview: images + key info */}
          <div className="bg-white rounded-2xl shadow-sm p-4 md:p-5 flex flex-col md:flex-row gap-5">
            <div className="md:w-56 shrink-0 space-y-3">
              {product.images.length > 0 ? (
                <>
                  <DetailImage src={resolveImage(product.images[activeImg])} alt={product.name} />
                  {product.images.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {product.images.map((img, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setActiveImg(i)}
                          className={`shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                            i === activeImg
                              ? 'border-teal-500 ring-2 ring-teal-100'
                              : 'border-transparent hover:border-gray-300'
                          }`}
                        >
                          <ThumbImage src={resolveImage(img)} />
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
            </div>

            <div className="flex-1 min-w-0 space-y-4">
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                  product.isActive
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-gray-50 text-gray-500 border-gray-200'
                }`}>
                  {product.isActive ? <Eye size={12} /> : <EyeOff size={12} />}
                  {product.isActive ? 'Visible to customers' : 'Hidden'}
                </span>
                {product.isBoosted && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-violet-50 text-violet-700 border border-violet-200">
                    <Rocket size={12} />
                    Boosted
                  </span>
                )}
                {(product.variantCount ?? variants.length) > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200">
                    <Layers size={12} />
                    {product.variantCount ?? variants.length} variant{(product.variantCount ?? variants.length) !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* Name + dates */}
              <div>
                <h2 className="text-lg font-bold text-gray-900 leading-snug">{product.name}</h2>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-gray-400">
                  <span>
                    Added {new Date(product.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  {product.updatedAt && (
                    <span>
                      Updated {new Date(product.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Star size={11} className="text-amber-400 fill-amber-400" />
                    {(product.avgRating ?? 0).toFixed(1)}
                    {(product.reviewCount ?? 0) > 0 && ` (${product.reviewCount} review${product.reviewCount === 1 ? '' : 's'})`}
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart size={11} className="text-pink-400" /> {product.wishlistCount ?? 0} saved
                  </span>
                </div>
              </div>

              {/* Pricing grid */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="bg-teal-50 border border-teal-100 rounded-xl px-3 py-3">
                  <p className="text-xs text-teal-500 font-medium mb-1">Selling Price</p>
                  <p className="text-base font-bold text-teal-700 leading-none">{formatPrice(product.sellingPrice)}</p>
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

              {/* Margin */}
              {profit !== null && (
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className={`w-4 h-4 shrink-0 ${profit >= 0 ? 'text-emerald-500' : 'text-red-500'}`} />
                  <span className="text-gray-500">Profit per unit:</span>
                  <span className={`font-semibold ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatPrice(profit)}
                    {marginPct !== null && <span className="text-gray-400 font-normal ml-1">({marginPct}% margin)</span>}
                  </span>
                </div>
              )}

              {/* Stock */}
              <div className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="text-sm text-gray-500">
                  {variants.length > 0 ? 'Total stock:' : 'Stock:'}
                </span>
                <span className={`text-sm font-semibold ${stockTone(product.stock)}`}>
                  {product.stock} units
                  {product.stock === 0 && <span className="ml-1 text-xs font-medium text-red-500">(Out of stock)</span>}
                  {product.stock > 0 && product.stock <= 5 && <span className="ml-1 text-xs font-medium text-amber-500">(Low stock)</span>}
                </span>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => navigate(`/products/${product.id}/edit`)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-colors"
                >
                  <Pencil size={14} /> Edit
                </button>
                {showVariants && (
                  <button
                    type="button"
                    onClick={() => navigate(`/products/${product.id}/variants`, { state: { from: `/products/${product.id}` } })}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Layers size={14} /> Variants
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowPreview(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold border border-amber-200 text-amber-700 hover:bg-amber-50 transition-colors"
                >
                  <ScanEye size={14} /> Customer preview
                </button>
              </div>
            </div>
          </div>

          {/* Variants breakdown */}
          {variants.length > 0 && (
            <Card title={`Variants (${variants.length})`}>
              <div className="flex items-center gap-3 text-xs text-gray-400 mb-2.5">
                {outVariants > 0 && <span className="text-red-500 font-medium">{outVariants} out of stock</span>}
                {lowVariants > 0 && <span className="text-amber-500 font-medium">{lowVariants} low</span>}
                <span className="text-gray-500">{totalVariantStock} total units</span>
              </div>
              <div className="rounded-xl border border-gray-100 overflow-hidden">
                <div className="flex items-center justify-between px-3.5 py-2 bg-gray-50 border-b border-gray-100">
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Variant</span>
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Price · Stock</span>
                </div>
                <div className="divide-y divide-gray-50 overflow-y-auto" style={{ maxHeight: '320px' }}>
                  {variants.map((v, i) => (
                    <div key={v.id} className="flex items-center justify-between px-3.5 py-2.5 bg-white">
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
                        <span className="text-sm text-gray-600">{formatPrice(v.sellingPrice)}</span>
                        <span className="text-gray-300 mx-1.5">·</span>
                        <span className={`text-sm font-semibold ${stockTone(v.stock)}`}>{v.stock}</span>
                        <span className="text-xs text-gray-400 ml-1">units</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Description */}
          {product.description && (
            <Card title="Description">
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{product.description}</p>
            </Card>
          )}

          {/* Attributes */}
          {visibleAttrs.length > 0 && (
            <Card title="Attributes">
              <dl className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                {visibleAttrs.map(field => (
                  <div key={field.key} className="flex items-start gap-3 px-3.5 py-2.5 bg-white">
                    <dt className="text-xs text-gray-400 w-32 shrink-0 pt-0.5">{field.label}</dt>
                    <dd className="flex-1 min-w-0">{renderAttrValue(field, product.attributes?.[field.key])}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          )}

          {/* Pickup location */}
          {product.pickupAddress && (
            <Card title="Pickup Location">
              <div className="flex items-start gap-3 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-gray-700">{product.pickupAddress}</p>
                  {product.pickupLat != null && product.pickupLong != null && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {Number(product.pickupLat).toFixed(4)}, {Number(product.pickupLong).toFixed(4)}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {showPreview && product && (
        <ProductPreview productId={product.id} onClose={() => setShowPreview(false)} />
      )}
    </div>
  );
}
