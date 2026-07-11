import { useState, useEffect, type JSX } from 'react';
import {
  X, Phone, Heart, Package,
  ToggleLeft, ToggleRight, Loader2,
} from 'lucide-react';
import { getCustomerById, toggleCustomerStatus, type CustomerDetail as CustomerDetailData } from '../../services/customerService';
import { useToast } from '../../hooks/useToast';
import StatusBadge from '../../components/ui/StatusBadge';
import { getInitials, getAvatarColor } from '../../lib/avatar';

interface CustomerDetailProps {
  customerId: string;
  onClose: () => void;
  onToggled: (customer: { id: string; isActive: boolean }) => void;
}

function formatPrice(val: number | string | null): string {
  if (val === null || val === undefined) return '—';
  return `₹${Number(val).toLocaleString('en-IN')}`;
}

function Skeleton({ className }: { className: string }): JSX.Element {
  return <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />;
}

function CustomerDetailSkeleton(): JSX.Element {
  return (
    <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-gray-100">
      <div className="md:w-56 shrink-0 p-5 space-y-4">
        <div className="flex flex-col items-center gap-3">
          <Skeleton className="w-20 h-20 rounded-full" />
          <Skeleton className="h-4 w-32 rounded" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <Skeleton className="h-10 rounded-xl" />
      </div>
      <div className="flex-1 p-5 space-y-5">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20 rounded" />
          <Skeleton className="h-4 w-40 rounded" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-24 rounded" />
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

function WishlistThumbnail({ src, alt }: { src: string; alt: string }): JSX.Element {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>(src ? 'loading' : 'error');
  return (
    <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 shrink-0 relative">
      {status === 'loading' && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200" />
      )}
      {status === 'error' ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <Package className="w-4 h-4 text-gray-300" />
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
          className={`w-full h-full object-cover transition-opacity duration-150 ${status === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
    </div>
  );
}

export default function CustomerDetail({ customerId, onClose, onToggled }: CustomerDetailProps): JSX.Element {
  const toast = useToast();
  const [customer, setCustomer] = useState<CustomerDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect((): void => {
    setLoading(true);
    getCustomerById(customerId)
      .then(c => { setCustomer(c); })
      .catch((): void => { toast.error('Failed to load customer'); onClose(); })
      .finally((): void => { setLoading(false); });
  }, [customerId]);

  async function handleToggle(): Promise<void> {
    if (!customer) return;
    setToggling(true);
    try {
      const result = await toggleCustomerStatus(customer.id);
      const updated: CustomerDetailData = { ...customer, isActive: result.isActive };
      setCustomer(updated);
      onToggled(result);
      toast.success(result.isActive ? 'Customer activated' : 'Customer deactivated');
    } catch {
      toast.error('Failed to update customer status');
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
              {loading ? 'Loading…' : (customer?.fullName ?? 'Customer Detail')}
            </h2>
            {!loading && customer && (
              <p className="text-xs text-gray-400 mt-0.5">
                Joined {new Date(customer.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
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
            <CustomerDetailSkeleton />
          ) : !customer ? null : (
            <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-gray-100">

              {/* Left — avatar + actions */}
              <div className="md:w-56 shrink-0 p-5 space-y-4">
                <div className="flex flex-col items-center text-center gap-2">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold ${getAvatarColor(customer.fullName)}`}>
                    {getInitials(customer.fullName)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 leading-snug">{customer.fullName || 'Unnamed'}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {customer.countryCode ? `(${customer.countryCode}) ` : ''}{customer.mobile}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <StatusBadge active={customer.isActive} dot />
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                      customer.isVerified
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        : 'bg-gray-100 text-gray-600 border-gray-200'
                    }`}>
                      {customer.isVerified ? 'Verified' : 'Unverified'}
                    </span>
                  </div>
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
                      : customer.isActive
                        ? <ToggleLeft className="w-4 h-4 text-gray-500" />
                        : <ToggleRight className="w-4 h-4 text-indigo-500" />
                    }
                    <span className={customer.isActive ? 'text-gray-700' : 'text-indigo-700'}>
                      {customer.isActive ? 'Deactivate' : 'Activate'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Right — details */}
              <div className="flex-1 p-5 space-y-5 min-w-0">

                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Contact</p>
                  <div className="flex items-center gap-2.5">
                    <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="text-sm text-gray-700">
                      {customer.countryCode ? `(${customer.countryCode}) ` : ''}{customer.mobile}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5" />
                    Wishlist ({customer.wishlistTotal})
                  </p>
                  {customer.wishlist.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">No wishlist items yet</p>
                  ) : (
                    <div className="space-y-2">
                      {customer.wishlist.map(item => (
                        <div key={item.id} className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5">
                          <WishlistThumbnail src={item.product.images[0] ?? ''} alt={item.product.name} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-800 truncate">{item.product.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-gray-600 font-medium">{formatPrice(item.product.sellingPrice)}</span>
                              {item.product.mrp && Number(item.product.mrp) > Number(item.product.sellingPrice) && (
                                <span className="text-xs text-gray-400 line-through">{formatPrice(item.product.mrp)}</span>
                              )}
                              {!item.product.isActive && (
                                <span className="text-xs text-amber-600">Inactive</span>
                              )}
                            </div>
                          </div>
                          <span className="text-xs text-gray-400 shrink-0">
                            {new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {customer.wishlistTotal > customer.wishlist.length && (
                    <p className="text-xs text-gray-400 mt-2">
                      Showing {customer.wishlist.length} of {customer.wishlistTotal} most recent items
                    </p>
                  )}
                </div>

              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
