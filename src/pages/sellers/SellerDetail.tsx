import { useState, useEffect, type JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X, Phone, Mail, MapPin, Store, Clock,
  Pencil, ToggleLeft, ToggleRight, Loader2,
} from 'lucide-react';
import { getSellerById, toggleSellerStatus, type Seller } from '../../services/sellerService';
import { useToast } from '../../hooks/useToast';
import type { WorkingHours } from '../../types';
import StatusBadge from '../../components/ui/StatusBadge';
import { getInitials, getAvatarColor } from '../../lib/avatar';

interface SellerDetailProps {
  sellerId: string;
  onClose: () => void;
  onToggled: (seller: Seller) => void;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
type Day = typeof DAYS[number];

function formatTime(t: string | undefined): string {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function Skeleton({ className }: { className: string }): JSX.Element {
  return <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />;
}

function SellerDetailSkeleton(): JSX.Element {
  return (
    <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-gray-100">
      <div className="md:w-56 shrink-0 p-5 space-y-4">
        <div className="flex flex-col items-center gap-3">
          <Skeleton className="w-20 h-20 rounded-full" />
          <Skeleton className="h-4 w-32 rounded" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <Skeleton className="h-10 rounded-xl" />
        <Skeleton className="h-10 rounded-xl" />
      </div>
      <div className="flex-1 p-5 space-y-5">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20 rounded" />
          <Skeleton className="h-5 w-48 rounded" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-20 rounded" />
          <Skeleton className="h-4 w-40 rounded" />
          <Skeleton className="h-4 w-52 rounded" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-20 rounded" />
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-4/5 rounded" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-24 rounded" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export default function SellerDetail({ sellerId, onClose, onToggled }: SellerDetailProps): JSX.Element {
  const navigate = useNavigate();
  const toast = useToast();
  const [seller, setSeller] = useState<Seller | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect((): void => {
    setLoading(true);
    getSellerById(sellerId)
      .then(s => { setSeller(s); })
      .catch((): void => { toast.error('Failed to load seller'); onClose(); })
      .finally((): void => { setLoading(false); });
  }, [sellerId]);

  async function handleToggle(): Promise<void> {
    if (!seller) return;
    setToggling(true);
    try {
      const result = await toggleSellerStatus(seller.id);
      const updated: Seller = { ...seller, isActive: result.isActive };
      setSeller(updated);
      onToggled(updated);
      toast.success(result.isActive ? 'Seller activated' : 'Seller deactivated');
    } catch {
      toast.error('Failed to update seller status');
    } finally {
      setToggling(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]">

        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="min-w-0 pr-4">
            <h2 className="text-sm font-semibold text-gray-900 truncate">
              {loading ? 'Loading…' : (seller?.businessName ?? seller?.fullName ?? 'Seller Detail')}
            </h2>
            {!loading && seller?.profile?.categories && seller.profile.categories.length > 0 && (
              <p className="text-xs text-gray-400 mt-0.5">
                {seller.profile.categories.map(c => c.name).join(', ')}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {loading ? (
            <SellerDetailSkeleton />
          ) : !seller ? null : (
            <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-gray-100">

              {/* Left — avatar + actions */}
              <div className="md:w-56 shrink-0 p-5 space-y-4">
                <div className="flex flex-col items-center text-center gap-2">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold ${getAvatarColor(seller.fullName)}`}>
                    {getInitials(seller.fullName)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 leading-snug">{seller.fullName || 'Unknown'}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {seller.countryCode ? `(${seller.countryCode}) ` : ''}{seller.mobile}
                    </p>
                  </div>
                  <StatusBadge active={seller.isActive} dot />
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    onClick={(): void => { void handleToggle(); }}
                    disabled={toggling}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-60 transition-colors"
                  >
                    {toggling
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : seller.isActive
                        ? <ToggleLeft className="w-4 h-4 text-gray-500" />
                        : <ToggleRight className="w-4 h-4 text-indigo-500" />
                    }
                    <span className={seller.isActive ? 'text-gray-700' : 'text-indigo-700'}>
                      {seller.isActive ? 'Deactivate' : 'Activate'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={(): void => { navigate(`/sellers/${seller.id}/edit`); }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium text-indigo-600 border border-indigo-100 rounded-xl hover:bg-indigo-50 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                    Edit Seller
                  </button>
                </div>
              </div>

              {/* Right — details */}
              <div className="flex-1 p-5 space-y-5 min-w-0">

                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Business</p>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
                      <Store className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="text-sm font-semibold text-gray-900">
                        {seller.businessName ?? seller.profile?.businessName ?? '—'}
                      </span>
                    </div>
                    {seller.profile?.categories && seller.profile.categories.length > 0 && (
                      <div className="ml-6 flex flex-wrap gap-1.5 mt-1">
                        {seller.profile.categories.map(c => (
                          <span key={c.id} className="inline-block px-2.5 py-0.5 text-xs bg-indigo-50 text-indigo-600 rounded-full font-medium border border-indigo-100">
                            {c.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Contact</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5">
                      <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="text-sm text-gray-700">
                        {seller.countryCode ? `(${seller.countryCode}) ` : ''}{seller.mobile}
                      </span>
                    </div>
                    {(seller.email ?? seller.profile?.email) && (
                      <div className="flex items-center gap-2.5">
                        <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="text-sm text-gray-700">{seller.email ?? seller.profile?.email}</span>
                      </div>
                    )}
                  </div>
                </div>

                {seller.profile?.bio && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Bio</p>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{seller.profile.bio}</p>
                  </div>
                )}

                {seller.profile?.workingHours && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Working Hours
                    </p>
                    <div className="bg-gray-50 border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-100">
                      {DAYS.map((day: Day) => {
                        const wh = seller.profile!.workingHours as WorkingHours;
                        const schedule = wh[day];
                        return (
                          <div key={day} className="flex items-center justify-between px-4 py-2.5">
                            <span className="text-xs font-medium text-gray-600 capitalize w-24 shrink-0">{day}</span>
                            {schedule?.isClosed ? (
                              <span className="text-xs text-gray-400 italic">Closed</span>
                            ) : (
                              <span className="text-xs text-gray-700 font-medium">
                                {formatTime(schedule?.open)} – {formatTime(schedule?.close)}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {seller.profile?.address && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Location</p>
                    <div className="flex items-start gap-2.5 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm text-gray-700">{seller.profile.address}</p>
                        {seller.profile.lat && seller.profile.long && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {Number(seller.profile.lat).toFixed(4)}, {Number(seller.profile.long).toFixed(4)}
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
