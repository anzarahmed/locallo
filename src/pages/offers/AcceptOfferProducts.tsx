import { useEffect, useState, type JSX } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Loader2, Package } from 'lucide-react';
import { getOffer, acceptOffer } from '../../services/offerService';
import { getProducts } from '../../services/sellerService';
import { useToast } from '../../hooks/useToast';
import { ApiError } from '../../lib/axios';
import { resolveImage } from '../../lib/imageUtils';
import type { Offer, Product } from '../../types';

const ACTIVE_PRODUCTS_LIMIT = 50;

export default function AcceptOfferProducts(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load(): Promise<void> {
      if (!id) return;
      setLoading(true);
      try {
        const [offerData, productsData] = await Promise.all([
          getOffer(Number(id)),
          getProducts({ filter: 'visible', limit: ACTIVE_PRODUCTS_LIMIT }),
        ]);
        if (offerData.offer.hasStarted) {
          toast.error('Product selection is locked — this offer has already started.');
          navigate(`/offers/${id}`, { replace: true });
          return;
        }
        setOffer(offerData.offer);
        setSelected(new Set(offerData.acceptedProductIds));
        setProducts(productsData.products);
        setTotal(productsData.total);
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Failed to load offer products');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [id]); // toast is stable

  function toggleProduct(productId: string): void {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }

  function checkAll(): void {
    setSelected(new Set(products.map(p => p.id)));
  }

  function uncheckAll(): void {
    setSelected(new Set());
  }

  async function handleSave(): Promise<void> {
    if (!id) return;
    setSaving(true);
    try {
      await acceptOffer(Number(id), [...selected]);
      toast.success(selected.size > 0 ? 'Offer applied to selected products' : 'Offer removed from all products');
      navigate(`/offers/${id}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to update offer selection');
    } finally {
      setSaving(false);
    }
  }

  const allChecked = products.length > 0 && selected.size === products.length;

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      <div
        className="px-6 md:px-8 pt-8 pb-16"
        style={{
          background: 'linear-gradient(150deg, #26B8B2 0%, #1A9E98 45%, #14817C 100%)',
          borderRadius: '0 0 28px 28px',
        }}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(`/offers/${id}`)}
            className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors shrink-0"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-white text-2xl font-bold leading-tight">Select Products</h1>
            {offer && <p className="text-white/70 text-sm mt-0.5 truncate max-w-xs">{offer.title}</p>}
          </div>
        </div>
      </div>

      <div className="px-6 md:px-8 -mt-8 relative z-10">
        <div className="bg-white rounded-2xl shadow-sm px-4 py-3 mb-4 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {selected.size} of {products.length} selected
            {total > products.length && (
              <span className="text-gray-400"> (showing first {products.length} of {total})</span>
            )}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={checkAll}
              disabled={loading || products.length === 0 || allChecked}
              className="px-3 py-1.5 rounded-full text-xs font-semibold text-teal-600 bg-teal-50 hover:bg-teal-100 disabled:opacity-40 transition-colors"
            >
              Check All
            </button>
            <button
              type="button"
              onClick={uncheckAll}
              disabled={loading || selected.size === 0}
              className="px-3 py-1.5 rounded-full text-xs font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 transition-colors"
            >
              Uncheck All
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm p-3 flex items-center gap-3 animate-pulse">
                <div className="w-12 h-12 rounded-xl bg-gray-100 shrink-0" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-100 rounded w-2/3 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-1/3" />
                </div>
              </div>
            ))
          ) : products.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
              <Package size={32} className="text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No active products to apply this offer to.</p>
            </div>
          ) : (
            products.map(product => (
              <ProductRow
                key={product.id}
                product={product}
                checked={selected.has(product.id)}
                onToggle={() => toggleProduct(product.id)}
              />
            ))
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 md:px-8 py-4">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving || loading}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-60 transition-opacity hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #1B9E98 0%, #157A75 100%)' }}
        >
          {saving && <Loader2 size={16} className="animate-spin" />}
          {saving ? 'Saving...' : 'Save Selection'}
        </button>
      </div>
    </div>
  );
}

interface ProductRowProps {
  product: Product;
  checked: boolean;
  onToggle: () => void;
}

function ProductRow({ product, checked, onToggle }: ProductRowProps): JSX.Element {
  const [imgError, setImgError] = useState(false);
  const thumbnailSrc = product.thumbnails?.[0] ?? product.images?.[0];
  const imageUrl = thumbnailSrc ? resolveImage(thumbnailSrc) : null;

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full bg-white rounded-2xl shadow-sm p-3 flex items-center gap-3 text-left transition-colors ${
        checked ? 'ring-2 ring-teal-500' : ''
      }`}
    >
      <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
        {imageUrl && !imgError ? (
          <img src={imageUrl} alt={product.name} className="w-full h-full object-cover" onError={() => setImgError(true)} />
        ) : (
          <Package size={18} className="text-gray-300" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">{product.name}</p>
        <p className="text-xs text-gray-400 mt-0.5">₹{product.sellingPrice.toLocaleString('en-IN')}</p>
      </div>

      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 transition-colors ${
        checked ? 'bg-teal-600 border-teal-600' : 'border-gray-300'
      }`}>
        {checked && <Check size={14} className="text-white" />}
      </div>
    </button>
  );
}
