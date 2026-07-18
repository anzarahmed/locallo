import { useState, useEffect, type JSX } from 'react';
import { X, Package, ChevronLeft, ChevronRight, Star, Heart, MapPin, Store, EyeOff, Loader2 } from 'lucide-react';
import { getSellerProduct, getProductVariants } from '../../services/sellerService';
import { ApiError } from '../../lib/axios';
import { resolveImage } from '../../lib/imageUtils';
import { formatPrice, discountPct } from '../../lib/formatters';
import type { Product, ProductVariant, AttributeField } from '../../types';

function renderAttrValue(field: AttributeField, raw: unknown): JSX.Element {
  if (raw === null || raw === undefined || raw === '') {
    return <span className="text-gray-400">—</span>;
  }

  if (field.type === 'color') {
    return (
      <span className="text-xs bg-gray-100 text-gray-700 rounded-full px-2.5 py-1">
        {String(raw)}
      </span>
    );
  }

  if (field.type === 'multiselect' && Array.isArray(raw) && field.options) {
    const labels = (raw as string[]).map(v => field.options?.find(o => o.value === v)?.label ?? v);
    return (
      <div className="flex flex-wrap gap-1.5">
        {labels.map(l => (
          <span key={l} className="text-xs bg-teal-50 text-teal-700 border border-teal-100 rounded-full px-2.5 py-0.5">
            {l}
          </span>
        ))}
      </div>
    );
  }

  if (field.type === 'select' && field.options) {
    const opt = field.options.find(o => o.value === raw);
    return (
      <span className="text-xs bg-gray-100 text-gray-700 rounded-full px-2.5 py-1">
        {opt?.label ?? String(raw)}
      </span>
    );
  }

  return <span className="text-sm text-gray-800 whitespace-pre-wrap">{String(raw)}</span>;
}

function ProductImage({ src, alt }: { src: string; alt: string }): JSX.Element {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  return (
    <div className="relative w-full h-full">
      {status === 'loading' && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200" />
      )}
      {status === 'error' ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gray-50">
          <Package className="w-12 h-12 text-gray-300" />
          <p className="text-xs text-gray-400">Image unavailable</p>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
          className={`w-full h-full object-cover transition-opacity duration-200 ${status === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
    </div>
  );
}

function Skeleton(): JSX.Element {
  return (
    <div className="animate-pulse">
      <div className="w-full aspect-square bg-gray-200" />
      <div className="p-5 space-y-4">
        <div className="space-y-2">
          <div className="h-6 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-200 rounded w-1/3" />
        </div>
        <div className="flex gap-3">
          <div className="h-10 bg-gray-200 rounded-xl flex-1" />
          <div className="h-10 bg-gray-200 rounded-xl w-32" />
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-gray-200 rounded w-20" />
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-5/6" />
          <div className="h-4 bg-gray-200 rounded w-4/6" />
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-gray-200 rounded w-24" />
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-2/3" />
        </div>
      </div>
    </div>
  );
}

interface ProductPreviewProps {
  productId: string;
  onClose: () => void;
}

export default function ProductPreview({ productId, onClose }: ProductPreviewProps): JSX.Element {
  const [product, setProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImg, setActiveImg] = useState(0);
  const [selectedAttrs, setSelectedAttrs] = useState<Record<string, string>>({});

  useEffect(() => {
    setLoading(true);
    setError(null);
    setSelectedAttrs({});
    setVariants([]);
    Promise.all([
      getSellerProduct(productId),
      getProductVariants(productId).catch(() => ({ variants: [] as ProductVariant[], product: null })),
    ])
      .then(([productRes, variantRes]) => {
        setProduct(productRes.product);
        setVariants(variantRes.variants);
        setActiveImg(0);
      })
      .catch(err => {
        setError(err instanceof ApiError ? err.message : 'Failed to load product');
      })
      .finally(() => setLoading(false));
  }, [productId]);

  const variantFields = product?.category?.attributeSchema?.filter(f => f.isVariant === true) ?? [];
  const colorField = variantFields.find(f => f.type === 'color');

  // Images to display: when a color is selected and a matching variant has images, use those
  const displayImages = (() => {
    if (!product) return [];
    if (colorField && selectedAttrs[colorField.key]) {
      const match = variants.find(v => {
        const attrs = v.attributes as Record<string, string>;
        return String(attrs[colorField.key]) === selectedAttrs[colorField.key] && v.images.length > 0;
      });
      if (match) return match.images;
    }
    return product.images;
  })();

  // Fully matched variant (all variant fields selected)
  const selectedVariant = variantFields.length > 0 && variantFields.every(f => selectedAttrs[f.key])
    ? variants.find(v =>
        variantFields.every(f =>
          String((v.attributes as Record<string, string>)[f.key]) === selectedAttrs[f.key],
        ),
      )
    : undefined;

  const displayPrice = selectedVariant?.sellingPrice ?? product?.sellingPrice ?? 0;
  const displayMrp = selectedVariant !== undefined ? selectedVariant.mrp : (product?.mrp ?? null);
  const displayStock = selectedVariant?.stock ?? product?.stock ?? 0;

  function selectAttr(key: string, value: string): void {
    setSelectedAttrs(prev => ({ ...prev, [key]: value }));
    setActiveImg(0);
  }

  function prevImage(): void {
    setActiveImg(i => (i - 1 + displayImages.length) % displayImages.length);
  }

  function nextImage(): void {
    setActiveImg(i => (i + 1) % displayImages.length);
  }

  const discount = discountPct(displayPrice, displayMrp);

  const visibleAttrs = product?.category?.attributeSchema?.filter(f => {
    if (f.isVariant) return false;
    const v = product.attributes?.[f.key];
    return v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0);
  }) ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full sm:max-w-sm sm:rounded-3xl flex flex-col max-h-screen sm:max-h-[90vh] overflow-hidden shadow-2xl">

        {/* Preview header bar */}
        <div className="shrink-0 bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wide shrink-0">
              Customer Preview
            </span>
            <span className="text-xs text-amber-600 truncate hidden sm:block">
              This is how customers see your product
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 hover:bg-amber-200 transition-colors shrink-0"
          >
            <X size={14} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <Skeleton />
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <Package size={40} className="text-gray-200 mb-3" />
              <p className="text-sm text-gray-500">{error}</p>
            </div>
          ) : !product ? null : (
            <>
              {/* Hidden product warning */}
              {!product.isActive && (
                <div className="bg-gray-700 px-4 py-2.5 flex items-center gap-2">
                  <EyeOff size={14} className="text-gray-300 shrink-0" />
                  <p className="text-xs text-gray-300">
                    This product is <span className="font-semibold text-white">hidden</span> — customers cannot see it
                  </p>
                </div>
              )}

              {/* Image gallery */}
              <div className="relative w-full aspect-square bg-gray-100">
                {displayImages.length > 0 ? (
                  <>
                    <ProductImage
                      src={resolveImage(displayImages[activeImg])}
                      alt={product.name}
                    />
                    {displayImages.length > 1 && (
                      <>
                        <button
                          onClick={prevImage}
                          className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm shadow flex items-center justify-center text-gray-700 hover:bg-white transition-colors"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <button
                          onClick={nextImage}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm shadow flex items-center justify-center text-gray-700 hover:bg-white transition-colors"
                        >
                          <ChevronRight size={16} />
                        </button>
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                          {displayImages.map((_, i) => (
                            <button
                              key={i}
                              onClick={() => setActiveImg(i)}
                              className={`rounded-full transition-all ${
                                i === activeImg
                                  ? 'w-4 h-1.5 bg-white'
                                  : 'w-1.5 h-1.5 bg-white/60 hover:bg-white/80'
                              }`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                    <Package className="w-12 h-12 text-gray-300" />
                    <p className="text-xs text-gray-400">No images</p>
                  </div>
                )}

                {/* Wishlist button (decorative) */}
                <button className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white shadow flex items-center justify-center">
                  <Heart size={18} className="text-gray-400" />
                </button>
              </div>

              {/* Thumbnail strip */}
              {displayImages.length > 1 && (
                <div className="flex gap-2 px-4 pt-3 overflow-x-auto pb-1">
                  {displayImages.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImg(i)}
                      className={`shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                        i === activeImg
                          ? 'border-teal-500 ring-2 ring-teal-100'
                          : 'border-transparent bg-gray-100 hover:border-gray-300'
                      }`}
                    >
                      <img
                        src={resolveImage(img)}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Product details */}
              <div className="px-4 pt-4 pb-6 space-y-4">

                {/* Name + category */}
                <div>
                  <h2 className="text-lg font-bold text-gray-900 leading-snug">{product.name}</h2>
                  {product.category && (
                    <p className="text-xs text-gray-400 mt-0.5">{product.category.name}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Star size={12} className="text-amber-400 fill-amber-400" />
                      0.0
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Heart size={12} className="text-pink-400" />
                      0 saved
                    </span>
                  </div>
                </div>

                {/* Variant selectors */}
                {variantFields.length > 0 && variants.length > 0 && (
                  <div className="space-y-3">
                    {variantFields.map(field => {
                      const usedValues = new Set(
                        variants.map(v => String((v.attributes as Record<string, string>)[field.key])),
                      );

                      if (field.type === 'color') {
                        const availableValues = [...usedValues].filter(Boolean);
                        if (availableValues.length === 0) return null;
                        return (
                          <div key={field.key}>
                            <p className="text-xs font-semibold text-gray-500 mb-2">
                              {field.label}
                              {selectedAttrs[field.key] && (
                                <span className="font-normal text-gray-400 ml-1.5">
                                  — {selectedAttrs[field.key]}
                                </span>
                              )}
                            </p>
                            <div className="flex gap-2 flex-wrap">
                              {availableValues.map(val => {
                                const isSelected = selectedAttrs[field.key] === val;
                                return (
                                  <button
                                    key={val}
                                    onClick={() => selectAttr(field.key, val)}
                                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all ${
                                      isSelected
                                        ? 'border-teal-500 bg-teal-50 text-teal-700'
                                        : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
                                    }`}
                                  >
                                    {val}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }

                      if (!field.options) return null;
                      const availableOptions = field.options.filter(o => usedValues.has(o.value));
                      if (availableOptions.length === 0) return null;

                      if (field.type === 'select' || field.type === 'multiselect') {
                        return (
                          <div key={field.key}>
                            <p className="text-xs font-semibold text-gray-500 mb-2">{field.label}</p>
                            <div className="flex gap-2 flex-wrap">
                              {availableOptions.map(opt => {
                                const isSelected = selectedAttrs[field.key] === opt.value;
                                return (
                                  <button
                                    key={opt.value}
                                    onClick={() => selectAttr(field.key, opt.value)}
                                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all ${
                                      isSelected
                                        ? 'border-teal-500 bg-teal-50 text-teal-700'
                                        : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
                                    }`}
                                  >
                                    {opt.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                )}

                {/* Pricing */}
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="text-2xl font-bold text-gray-900">
                    {formatPrice(displayPrice)}
                  </span>
                  {displayMrp != null && displayMrp > displayPrice && (
                    <span className="text-sm text-gray-400 line-through">
                      {formatPrice(displayMrp)}
                    </span>
                  )}
                  {discount !== null && (
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      {discount}% off
                    </span>
                  )}
                </div>

                {/* Stock */}
                <div>
                  {displayStock === 0 ? (
                    <span className="inline-flex items-center text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-3 py-1 rounded-full">
                      Out of stock
                    </span>
                  ) : displayStock <= 5 ? (
                    <span className="inline-flex items-center text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                      Only {displayStock} left
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                      In stock
                    </span>
                  )}
                </div>

                {/* Description */}
                {product.description && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
                      Description
                    </p>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {product.description}
                    </p>
                  </div>
                )}

                {/* Attributes */}
                {visibleAttrs.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2.5">
                      Details
                    </p>
                    <dl className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                      {visibleAttrs.map(field => (
                        <div key={field.key} className="flex items-start gap-3 px-3 py-2.5 bg-white">
                          <dt className="text-xs text-gray-400 w-28 shrink-0 pt-0.5">{field.label}</dt>
                          <dd className="flex-1 min-w-0">
                            {renderAttrValue(field, product.attributes?.[field.key])}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}

                {/* Seller info */}
                <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                    <Store size={16} className="text-teal-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {/* Seller business name comes from profile, not product, so show placeholder */}
                      Your Business Name
                    </p>
                    {product.pickupAddress ? (
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5 truncate">
                        <MapPin size={10} className="shrink-0" />
                        {product.pickupAddress}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400 mt-0.5">Seller</p>
                    )}
                  </div>
                </div>

                {/* Add to cart button (decorative) */}
                <button
                  disabled
                  className={`w-full py-3.5 rounded-2xl text-sm font-bold tracking-wide transition-colors ${
                    displayStock === 0
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-teal-600 text-white opacity-80 cursor-not-allowed'
                  }`}
                >
                  {displayStock === 0 ? 'Out of stock' : 'Add to Cart'}
                </button>

                <p className="text-center text-xs text-gray-300">
                  Preview only — buttons are not functional
                </p>

              </div>
            </>
          )}
        </div>

        {loading && (
          <div className="shrink-0 flex items-center justify-center gap-2 py-3 border-t border-gray-100 text-xs text-gray-400">
            <Loader2 size={12} className="animate-spin" />
            Loading preview…
          </div>
        )}
      </div>
    </div>
  );
}
