import { useEffect, useState, type JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BadgePercent, ChevronRight, Tag } from 'lucide-react';
import { getAcceptedOffers } from '../../services/offerService';
import { useToast } from '../../hooks/useToast';
import { ApiError } from '../../lib/axios';
import { formatDateTime, offerSummary, offerTypeLabel } from '../../lib/offerUtils';
import type { AcceptedOffer } from '../../types';

export default function AcceptedOffers(): JSX.Element {
  const navigate = useNavigate();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState<AcceptedOffer[]>([]);

  useEffect(() => {
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const data = await getAcceptedOffers({ limit: 50 });
        setOffers(data.offers);
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Failed to load accepted offers');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []); // toast is stable

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
            className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors shrink-0 md:hidden"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-white text-2xl font-bold leading-tight">Accepted Offers</h1>
        </div>
      </div>

      <div className="px-6 md:px-8 -mt-8 relative z-10 pb-8 space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm p-4 animate-pulse space-y-3">
              <div className="h-4 bg-gray-100 rounded w-1/3" />
              <div className="h-5 bg-gray-100 rounded w-2/3" />
              <div className="h-4 bg-gray-100 rounded w-1/2" />
            </div>
          ))
        ) : offers.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <Tag size={32} className="text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">You haven't accepted any offers yet.</p>
            <p className="text-xs text-gray-300 mt-1">Offers you accept from notifications will show up here.</p>
          </div>
        ) : (
          offers.map(offer => (
            <button
              key={offer.id}
              type="button"
              onClick={() => navigate(`/offers/${offer.id}`)}
              className="w-full bg-white rounded-2xl shadow-sm p-4 text-left flex items-center gap-3 hover:shadow-md transition-shadow"
            >
              <div className="flex-1 min-w-0">
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full">
                  <BadgePercent size={12} />
                  {offerTypeLabel(offer)}
                </span>
                <p className="text-sm font-bold text-gray-900 mt-2 truncate">{offer.title}</p>
                <p className="text-xs font-semibold text-teal-600 mt-0.5 truncate">{offerSummary(offer)}</p>
                <p className="text-xs text-gray-400 mt-1">
                  Applied to {offer.acceptedCount} product{offer.acceptedCount !== 1 ? 's' : ''} · Ends {formatDateTime(offer.endDate)}
                </p>
              </div>
              <ChevronRight size={18} className="text-gray-300 shrink-0" />
            </button>
          ))
        )}
      </div>
    </div>
  );
}
