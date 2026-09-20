import { useState, useEffect, type JSX } from 'react';
import { Package, ChevronLeft, ChevronRight, ChevronDown, Star, Heart, MapPin, Store, Share2, PenLine, EyeOff, Loader2 } from 'lucide-react';
import { getSellerProduct, getProductVariants, getProfile, getProducts, getProductReviews } from '../../services/sellerService';
import { ApiError } from '../../lib/axios';
import { resolveImage } from '../../lib/imageUtils';
import { formatPrice, discountPct } from '../../lib/formatters';
import type { Product, ProductVariant, AttributeField, SellerProfile, ProductReview } from '../../types';

const HEX_COLOR = /^#[0-9a-fA-F]{3,8}$/;

function attrDisplayValue(field: AttributeField, raw: unknown): string {
  if (raw === null || raw === undefined || raw === '') return '—';

  if (field.type === 'multiselect' && Array.isArray(raw)) {
    const labels = (raw as string[]).map(v => field.options?.find(o => o.value === v)?.label ?? v);
    return labels.join(', ') || '—';
  }

  if ((field.type === 'select' || field.type === 'color') && field.options) {
    const opt = field.options.find(o => o.value === raw);
    return opt?.label ?? String(raw);
  }

  return String(raw);
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
        <>
          <img
            src={src}
            aria-hidden="true"
            className={`absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-60 transition-opacity duration-200 ${status === 'loaded' ? 'opacity-60' : 'opacity-0'}`}
          />
          <img
            src={src}
            alt={alt}
            onLoad={() => setStatus('loaded')}
            onError={() => setStatus('error')}
            className={`relative w-full h-full object-contain transition-opacity duration-200 ${status === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
          />
        </>
      )}
    </div>
  );
}

function Skeleton(): JSX.Element {
  return (
    <div className="animate-pulse">
      <div className="w-full aspect-square bg-gray-200" />
      <div className="p-4 space-y-4">
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-16" />
          <div className="h-16 bg-gray-200 rounded-2xl w-full" />
        </div>
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-5/6" />
        <div className="flex gap-3">
          <div className="h-11 bg-gray-200 rounded-full flex-1" />
        </div>
        <div className="h-11 bg-gray-200 rounded-full w-full" />
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
  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(null);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [reviewSummary, setReviewSummary] = useState<{ avgRating: number; reviewCount: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImg, setActiveImg] = useState(0);
  const [selectedAttrs, setSelectedAttrs] = useState<Record<string, string>>({});
  const [detailsOpen, setDetailsOpen] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setSelectedAttrs({});
    setVariants([]);
    setSimilarProducts([]);
    setReviews([]);
    setReviewSummary(null);
    Promise.all([
      getSellerProduct(productId),
      getProductVariants(productId).catch(() => ({ variants: [] as ProductVariant[], product: null })),
      getProfile().catch(() => null),
    ])
      .then(([productRes, variantRes, profileRes]) => {
        setProduct(productRes.product);
        setVariants(variantRes.variants);
        setSellerProfile(profileRes?.profile ?? null);
        setActiveImg(0);

        const variantFields = productRes.product.category?.attributeSchema?.filter(f => f.isVariant === true) ?? [];
        const defaults: Record<string, string> = {};
        variantFields.forEach(field => {
          const usedValues = new Set(
            variantRes.variants.map(v => String((v.attributes as Record<string, string>)[field.key])),
          );
          if (field.type === 'color') {
            const firstVal = [...usedValues].filter(Boolean)[0];
            if (firstVal) defaults[field.key] = firstVal;
          } else if (field.options) {
            const firstOpt = field.options.find(o => usedValues.has(o.value));
            if (firstOpt) defaults[field.key] = firstOpt.value;
          }
        });
        setSelectedAttrs(defaults);

        getProducts({ limit: 50, filter: 'visible' })
          .then(res => {
            const rest = res.products.filter(p => p.id !== productRes.product.id && p.categoryId === productRes.product.categoryId);
            setSimilarProducts(rest.slice(0, 8));
          })
          .catch(() => setSimilarProducts([]));

        getProductReviews(productId, { limit: 3 })
          .then(res => {
            setReviews(res.reviews);
            setReviewSummary(res.summary);
          })
          .catch(() => {
            setReviews([]);
            setReviewSummary(null);
          });
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

        {/* Mobile-app-style header: back / title / share / wishlist */}
        <div className="shrink-0 flex items-center gap-2 px-3 py-3 border-b border-gray-100 bg-white">
          <button
            onClick={onClose}
            className="p-1.5 -ml-1 rounded-full text-gray-900 hover:bg-gray-100 transition-colors shrink-0"
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="flex-1 min-w-0 truncate text-[15px] font-semibold text-gray-900">
            {product?.name ?? 'Product'}
          </h2>
          <button disabled className="p-1.5 rounded-full text-gray-700 opacity-60 cursor-default shrink-0">
            <Share2 size={17} />
          </button>
          <button disabled className="p-1.5 rounded-full text-gray-700 opacity-60 cursor-default shrink-0">
            <Heart size={17} />
          </button>
        </div>

        {/* Preview indicator strip */}
        <div className="shrink-0 bg-amber-50 border-b border-amber-100 px-4 py-1.5 text-center">
          <span className="text-[10px] font-semibold text-amber-700 tracking-wide uppercase">
            Customer preview — this is what shoppers see
          </span>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto overflow-x-hidden flex-1">
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
                      </>
                    )}
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                    <Package className="w-12 h-12 text-gray-300" />
                    <p className="text-xs text-gray-400">No images</p>
                  </div>
                )}
              </div>

              {/* Dot indicator */}
              {displayImages.length > 1 && (
                <div className="flex items-center justify-center gap-1.5 pt-3">
                  {displayImages.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImg(i)}
                      className={`rounded-full transition-all ${
                        i === activeImg ? 'w-4 h-1.5 bg-orange-500' : 'w-1.5 h-1.5 bg-gray-200 hover:bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              )}

              {/* Thumbnail strip */}
              {displayImages.length > 1 && (
                <div className="flex gap-2 px-4 pt-2 overflow-x-auto pb-1">
                  {displayImages.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImg(i)}
                      className={`shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 bg-gray-100 transition-all ${
                        i === activeImg
                          ? 'border-orange-500 ring-2 ring-orange-100'
                          : 'border-transparent hover:border-gray-300'
                      }`}
                    >
                      <img
                        src={resolveImage(img)}
                        alt=""
                        className="w-full h-full object-contain"
                      />
                    </button>
                  ))}
                </div>
              )}

              <div className="px-4 pt-4 pb-6 space-y-4">

                {/* Variant selectors */}
                {variantFields.length > 0 && variants.length > 0 && (
                  <div className="space-y-3.5">
                    {variantFields.map(field => {
                      const usedValues = new Set(
                        variants.map(v => String((v.attributes as Record<string, string>)[field.key])),
                      );

                      if (field.type === 'color') {
                        const availableValues = [...usedValues].filter(Boolean);
                        if (availableValues.length === 0) return null;
                        const labelFor = (val: string): string =>
                          field.options?.find(o => o.value === val)?.label ?? val;
                        return (
                          <div key={field.key}>
                            <p className="text-sm text-gray-500 mb-2">
                              {field.label}:{' '}
                              <span className="font-semibold text-gray-900">
                                {selectedAttrs[field.key] ? labelFor(selectedAttrs[field.key]) : '—'}
                              </span>
                            </p>
                            <div className="flex gap-2.5 flex-wrap">
                              {availableValues.map(val => {
                                const isSelected = selectedAttrs[field.key] === val;
                                const isHex = HEX_COLOR.test(val);
                                return (
                                  <button
                                    key={val}
                                    onClick={() => selectAttr(field.key, val)}
                                    title={labelFor(val)}
                                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                                      isSelected ? 'ring-2 ring-offset-2 ring-orange-500' : ''
                                    }`}
                                    style={isHex ? { backgroundColor: val } : undefined}
                                  >
                                    {!isHex && (
                                      <span className="w-full h-full rounded-full border-2 border-gray-200 bg-gray-100 flex items-center justify-center text-[9px] font-semibold text-gray-500">
                                        {labelFor(val).slice(0, 2).toUpperCase()}
                                      </span>
                                    )}
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
                        const selectedOpt = availableOptions.find(o => o.value === selectedAttrs[field.key]);
                        return (
                          <div key={field.key}>
                            <p className="text-sm text-gray-500 mb-2">
                              {field.label}:{' '}
                              <span className="font-semibold text-gray-900">{selectedOpt?.label ?? '—'}</span>
                            </p>
                            <div className="flex gap-2.5 flex-wrap">
                              {availableOptions.map(opt => {
                                const isSelected = selectedAttrs[field.key] === opt.value;
                                const isShort = opt.label.length <= 3;
                                return (
                                  <button
                                    key={opt.value}
                                    onClick={() => selectAttr(field.key, opt.value)}
                                    className={`font-semibold border transition-all ${
                                      isShort
                                        ? 'w-10 h-10 rounded-full flex items-center justify-center text-sm'
                                        : 'min-w-[40px] px-3.5 py-2 rounded-full text-sm'
                                    } ${
                                      isSelected
                                        ? 'text-white border-transparent'
                                        : 'border-gray-200 text-gray-700 hover:border-gray-300 bg-white'
                                    }`}
                                    style={isSelected ? { background: 'linear-gradient(90deg, #FFB300 0%, #E53000 100%)' } : undefined}
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

                {/* Info card: category, price, name, rating, stock */}
                <div className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    {product.category && (
                      <span className="text-xs font-semibold text-orange-500">{product.category.name}</span>
                    )}
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-gray-900 leading-tight">{formatPrice(displayPrice)}</p>
                      {(displayMrp != null && displayMrp > displayPrice) || discount !== null ? (
                        <p className="flex items-baseline gap-1.5 justify-end whitespace-nowrap">
                          {displayMrp != null && displayMrp > displayPrice && (
                            <span className="text-xs text-gray-400 line-through">{formatPrice(displayMrp)}</span>
                          )}
                          {discount !== null && (
                            <span className="text-xs font-semibold text-emerald-600">{discount}% OFF</span>
                          )}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <h2 className="text-base font-bold text-gray-900 leading-snug mt-1.5">{product.name}</h2>

                  <div className="flex flex-col items-start gap-1 mt-2">
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Star size={12} className="text-amber-400 fill-amber-400" />
                      {(product.avgRating ?? 0).toFixed(1)}
                      {(product.reviewCount ?? 0) > 0 && ` (${product.reviewCount})`}
                    </span>
                    {displayStock === 0 ? (
                      <span className="text-xs font-semibold text-red-600">Out of stock</span>
                    ) : displayStock <= 5 ? (
                      <span className="text-xs font-semibold text-amber-600">Only {displayStock} left</span>
                    ) : (
                      <span className="text-xs font-semibold text-emerald-600">{displayStock} in stock</span>
                    )}
                  </div>
                </div>

                {/* Description */}
                {product.description && (
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                    {product.description}
                  </p>
                )}

                {/* Details */}
                {visibleAttrs.length > 0 && (
                  <div>
                    <button
                      onClick={() => setDetailsOpen(o => !o)}
                      className="w-full flex items-center justify-between text-sm font-bold text-gray-900 mb-2"
                    >
                      Details
                      <ChevronDown size={16} className={`text-gray-400 transition-transform ${detailsOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {detailsOpen && (
                      <div className="border border-gray-200 rounded-xl divide-y divide-gray-200 overflow-hidden">
                        {visibleAttrs.map(field => (
                          <div
                            key={field.key}
                            className="flex items-center justify-between gap-3 px-4 py-3"
                          >
                            <span className="text-sm text-gray-500">{field.label}</span>
                            <span className="text-sm font-semibold text-gray-900 text-right">
                              {attrDisplayValue(field, product.attributes?.[field.key])}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Add to wishlist button (decorative) */}
                <button
                  disabled
                  className="w-full py-3.5 rounded-full text-sm font-bold tracking-wide text-white opacity-80 cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(90deg, #FFB300 0%, #E53000 100%)' }}
                >
                  <Heart size={16} />
                  Add to Wishlist
                </button>

                {/* Get direction button (decorative) */}
                <button
                  disabled
                  className="w-full py-3.5 rounded-full text-sm font-bold tracking-wide text-white opacity-80 cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(90deg, #26B8B2 0%, #14817C 100%)' }}
                >
                  <MapPin size={16} />
                  Get Direction to Shop
                </button>

                {/* Shop info card */}
                <div className="border border-orange-100 rounded-2xl px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-sky-50 flex items-center justify-center shrink-0">
                      <Store size={18} className="text-sky-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-gray-900 truncate">
                        {sellerProfile?.businessName ?? 'Your Business Name'}
                      </p>
                      {(sellerProfile?.city ?? product.pickupAddress) && (
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5 truncate">
                          <MapPin size={10} className="shrink-0" />
                          {sellerProfile?.city ?? product.pickupAddress}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2.5">
                    <p className="text-xs text-gray-400 flex-1 min-w-0 truncate">Visit shop &amp; browse all products</p>
                    <span className="text-xs font-semibold text-orange-500 whitespace-nowrap shrink-0 ml-2">
                      View all →
                    </span>
                  </div>
                </div>

                {/* Similar products */}
                {similarProducts.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 mb-2.5">Similar Products</h3>
                    <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4">
                      {similarProducts.map(p => {
                        const pDiscount = discountPct(p.sellingPrice, p.mrp);
                        return (
                          <div key={p.id} className="shrink-0 w-28">
                            <div className="w-28 h-28 rounded-xl overflow-hidden bg-gray-100 border border-gray-100">
                              {p.images?.[0] ? (
                                <img
                                  src={resolveImage(p.images[0])}
                                  alt={p.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Package size={20} className="text-gray-300" />
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-gray-700 mt-1.5 line-clamp-2 leading-snug">{p.name}</p>
                            <div className="flex items-baseline gap-1.5 mt-0.5">
                              <span className="text-xs font-bold text-gray-900">{formatPrice(p.sellingPrice)}</span>
                              {pDiscount !== null && (
                                <span className="text-[10px] text-gray-400 line-through">{formatPrice(p.mrp)}</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Customer reviews */}
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <h3 className="text-sm font-bold text-gray-900">Customer Reviews</h3>
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Star size={12} className="text-amber-400 fill-amber-400" />
                      {(reviewSummary?.avgRating ?? product.avgRating ?? 0).toFixed(1)}
                    </span>
                  </div>
                  <button
                    disabled
                    className="w-full py-2.5 rounded-full text-xs font-semibold text-orange-500 border border-orange-300 opacity-80 cursor-not-allowed flex items-center justify-center gap-1.5"
                  >
                    <PenLine size={13} />
                    Write a review
                  </button>

                  {reviews.length > 0 && (
                    <div className="space-y-2.5 mt-3">
                      {reviews.map(review => {
                        const initials = review.customer.name
                          .split(' ')
                          .map(w => w[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase();
                        return (
                          <div key={review.id} className="flex items-start gap-3 border border-gray-100 rounded-2xl px-4 py-3">
                            <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600 shrink-0 overflow-hidden">
                              {review.customer.image ? (
                                <img src={resolveImage(review.customer.image)} alt="" className="w-full h-full object-cover" />
                              ) : (
                                initials || '?'
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold text-gray-900 truncate">{review.customer.name}</p>
                              <div className="flex items-center gap-0.5 mt-0.5">
                                {[1, 2, 3, 4, 5].map(i => (
                                  <Star
                                    key={i}
                                    size={11}
                                    className={i <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}
                                  />
                                ))}
                              </div>
                              {review.review && (
                                <p className="text-xs text-gray-600 mt-1 leading-relaxed">{review.review}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

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
