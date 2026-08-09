import { useEffect, useState, type JSX } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BadgePercent, Calendar, CheckCircle2, Lock, Package } from 'lucide-react';
import { getOffer } from '../../services/offerService';
import { useToast } from '../../hooks/useToast';
import { ApiError } from '../../lib/axios';
import { resolveImage } from '../../lib/imageUtils';
import { formatDateTime, hasOfferStarted, offerSummary, offerTypeLabel } from '../../lib/offerUtils';
import type { Offer, Product } from '../../types';

export default function OfferDetail(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [acceptedProducts, setAcceptedProducts] = useState<Product[]>([]);

  useEffect(() => {
    async function load(): Promise<void> {
      if (!id) return;
      setLoading(true);
      try {
        const data = await getOffer(Number(id));
        setOffer(data.offer);
        setAcceptedProducts(data.acceptedProducts);
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Failed to load offer');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [id]); // toast is stable

  return (
    <div className="min-h-screen bg-gray-50">
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
            onClick={() => navigate('/dashboard')}
            className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors shrink-0"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-white text-2xl font-bold leading-tight">Offer Details</h1>
        </div>
      </div>

      <div className="px-6 md:px-8 -mt-8 relative z-10 pb-8">
        {loading ? (
          <div className="bg-white rounded-2xl shadow-sm p-4 animate-pulse space-y-3">
            <div className="h-5 bg-gray-100 rounded w-2/3" />
            <div className="h-4 bg-gray-100 rounded w-1/2" />
            <div className="h-4 bg-gray-100 rounded w-full" />
          </div>
        ) : !offer ? (
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center text-sm text-gray-400">
            Offer not found.
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 space-y-4">
              <div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full">
                  <BadgePercent size={12} />
                  {offerTypeLabel(offer)}
                </span>
                <h2 className="text-lg font-bold text-gray-900 mt-2">{offer.title}</h2>
                <p className="text-sm font-semibold text-teal-600 mt-1">{offerSummary(offer)}</p>
              </div>

              {offer.description && (
                <p className="text-sm text-gray-600 leading-relaxed">{offer.description}</p>
              )}

              <div className="flex items-start gap-2 text-sm text-gray-500 bg-gray-50 rounded-xl px-3.5 py-3">
                <Calendar size={16} className="text-gray-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-700">Offer Period</p>
                  <p>{formatDateTime(offer.startDate)} – {formatDateTime(offer.endDate)}</p>
                </div>
              </div>

              {acceptedProducts.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-teal-700 bg-teal-50 rounded-xl px-3.5 py-3">
                    <CheckCircle2 size={16} className="shrink-0" />
                    Applied to {acceptedProducts.length} product{acceptedProducts.length !== 1 ? 's' : ''}
                  </div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-1">Selected products</p>
                  <div className="space-y-2">
                    {acceptedProducts.map(product => (
                      <AcceptedProductRow key={product.id} product={product} />
                    ))}
                  </div>
                </div>
              )}

              {hasOfferStarted(offer) ? (
                <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-xl px-3.5 py-3">
                  <Lock size={16} className="text-gray-400 shrink-0" />
                  Product selection is locked — this offer has already started.
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate(`/offers/${offer.id}/accept`)}
                  className="w-full py-3 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #1B9E98 0%, #157A75 100%)' }}
                >
                  {acceptedProducts.length > 0 ? 'Manage Selected Products' : 'Accept Offer'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AcceptedProductRow({ product }: { product: Product }): JSX.Element {
  const [imgError, setImgError] = useState(false);
  const thumbnailSrc = product.thumbnails?.[0] ?? product.images?.[0];
  const imageUrl = thumbnailSrc ? resolveImage(thumbnailSrc) : null;

  return (
    <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
      <div className="w-10 h-10 rounded-lg bg-white overflow-hidden shrink-0 flex items-center justify-center">
        {imageUrl && !imgError ? (
          <img src={imageUrl} alt={product.name} className="w-full h-full object-cover" onError={() => setImgError(true)} />
        ) : (
          <Package size={16} className="text-gray-300" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{product.name}</p>
        <p className="text-xs text-gray-400">₹{product.sellingPrice.toLocaleString('en-IN')}</p>
      </div>
    </div>
  );
}
