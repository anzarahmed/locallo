import { useEffect, useState, type JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, TrendingUp, Heart, BarChart2, Eye } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { getProfile, getProducts, getDashboardStats } from '../../services/sellerService';
import { ApiError } from '../../lib/axios';
import { resolveImage } from '../../lib/imageUtils';
import type { ProfileResponse, Product, DashboardStats } from '../../types';

function initials(name: string | null): string {
  if (!name) return 'S';
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

export default function Dashboard(): JSX.Element {
  const { seller } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load(): Promise<void> {
      try {
        const [profileData, allProds, dashStats] = await Promise.all([
          getProfile(),
          getProducts({ page: 1, limit: 5 }),
          getDashboardStats(),
        ]);
        setProfile(profileData);
        setProducts(allProds.products);
        setStats(dashStats);
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const businessName = profile?.profile?.businessName ?? seller?.fullName ?? 'Seller';

  function fmtGrowthPercent(val: number): string {
    if (val === 0) return '+0%';
    return (val > 0 ? '+' : '') + val.toFixed(1).replace(/\.0$/, '') + '%';
  }

  function fmtGrowthCount(val: number): string {
    if (val === 0) return '+0';
    return (val > 0 ? '+' : '') + val;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* ── Teal header ── */}
      <div
        className="relative px-5 pt-8 pb-28"
        style={{
          background: 'linear-gradient(150deg, #26B8B2 0%, #1A9E98 45%, #14817C 100%)',
          borderRadius: '0 0 28px 28px',
        }}
      >
        {/* Welcome + avatar */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/70 text-sm font-normal">Welcome back,</p>
            <h1 className="text-white text-[22px] font-bold leading-tight mt-0.5">{businessName}</h1>
          </div>
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-base border-2 border-white/30 shrink-0"
            style={{ background: 'rgba(255,255,255,0.25)' }}
          >
            {initials(businessName)}
          </div>
        </div>
      </div>

      {/* ── Content (overlaps header) ── */}
      <div className="px-4 -mt-20 relative z-10">
        {/* Stat cards 2×2 */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <StatCard
            icon={<Eye size={20} className="text-teal-600" />}
            bgIcon={<Eye size={88} className="text-teal-500" />}
            iconBg="bg-teal-50"
            accentClass="bg-teal-500"
            value={loading || !stats ? null : stats.totalViews.toLocaleString()}
            label="Total Views"
            growth={stats ? fmtGrowthPercent(stats.viewsGrowthPercent) : '+0%'}
            sublabel="this month"
          />
          <StatCard
            icon={<Heart size={20} className="text-pink-500" />}
            bgIcon={<Heart size={88} className="text-pink-400" />}
            iconBg="bg-pink-50"
            accentClass="bg-pink-400"
            value={loading || !stats ? null : stats.wishlistSaves.toLocaleString()}
            label="Wishlist Saves"
            growth={stats ? fmtGrowthPercent(stats.wishlistGrowthPercent) : '+0%'}
            sublabel="this month"
          />
          <StatCard
            icon={<Package size={20} className="text-teal-600" />}
            bgIcon={<Package size={88} className="text-teal-500" />}
            iconBg="bg-teal-50"
            accentClass="bg-teal-500"
            value={loading || !stats ? null : String(stats.totalProducts)}
            label="Products"
            growth={stats ? fmtGrowthCount(stats.productsAddedThisWeek) : '+0'}
            sublabel="this week"
          />
          <StatCard
            icon={<TrendingUp size={20} className="text-amber-500" />}
            bgIcon={<TrendingUp size={88} className="text-amber-400" />}
            iconBg="bg-amber-50"
            accentClass="bg-amber-400"
            value={loading || !stats ? null : stats.interestRate.toFixed(1) + '%'}
            label="Interest Rate"
            growth={stats ? fmtGrowthPercent(stats.interestRateGrowthPercent) : '+0%'}
            sublabel="this month"
          />
        </div>

        {/* Top Products */}
        <div className="mb-6">
          <h2 className="text-[16px] font-bold text-gray-800 mb-3">Top Products</h2>

          <div className="flex flex-col gap-2.5">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => <ProductRowSkeleton key={i} />)
            ) : products.length === 0 ? (
              <div className="bg-white rounded-2xl py-12 text-center shadow-sm">
                <Package size={36} className="text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400">No products yet</p>
                <button
                  onClick={() => navigate('/products/add')}
                  className="mt-3 text-sm font-semibold text-teal-600 hover:text-teal-700"
                >
                  Add your first product
                </button>
              </div>
            ) : (
              products.map((product, i) => (
                <ProductRow key={product.id} product={product} rank={i + 1} />
              ))
            )}
          </div>

          {!loading && stats && stats.totalProducts > 5 && (
            <button
              onClick={() => navigate('/products')}
              className="w-full mt-3 py-3 text-sm font-semibold text-teal-600 hover:text-teal-700 transition-colors"
            >
              View all {stats.totalProducts} products →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Stat card ── */
interface StatCardProps {
  icon: JSX.Element;
  bgIcon: JSX.Element;
  iconBg: string;
  accentClass: string;
  value: string | null;
  label: string;
  growth: string;
  sublabel: string;
}

function StatCard({ icon, bgIcon, iconBg, accentClass, value, label, growth, sublabel }: StatCardProps): JSX.Element {
  const isPositive = growth.startsWith('+') && growth !== '+0' && growth !== '+0%';
  const isZero = growth === '+0' || growth === '+0%';

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden relative">
      {/* Top accent line */}
      <div className={`h-1 ${accentClass}`} />

      <div className="px-4 pt-3.5 pb-4 relative">
        {/* Large decorative background icon */}
        <div className="absolute right-1 bottom-1 opacity-[0.06] pointer-events-none select-none">
          {bgIcon}
        </div>

        {/* Icon + growth badge row */}
        <div className="flex items-center justify-between mb-3">
          <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
            {icon}
          </div>
          <span
            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
              isPositive
                ? 'text-emerald-600 bg-emerald-50'
                : isZero
                  ? 'text-gray-400 bg-gray-100'
                  : 'text-red-500 bg-red-50'
            }`}
          >
            {growth}
          </span>
        </div>

        {/* Value */}
        {value === null ? (
          <div className="h-7 w-16 bg-gray-100 rounded-lg animate-pulse mb-1.5" />
        ) : (
          <p className="text-[26px] font-bold text-gray-800 leading-tight">{value}</p>
        )}

        {/* Label + period */}
        <p className="text-xs text-gray-500 mt-0.5 leading-tight">{label}</p>
        <p className="text-[11px] text-gray-400 mt-0.5">{sublabel}</p>
      </div>
    </div>
  );
}

/* ── Product row ── */
function ProductRow({ product, rank }: { product: Product; rank: number }): JSX.Element {
  const thumbnailSrc = product.thumbnails?.[0] ?? product.images?.[0];
  const imageUrl = thumbnailSrc ? resolveImage(thumbnailSrc) : null;
  const [imgError, setImgError] = useState(false);

  return (
    <div className="bg-white rounded-2xl flex items-center gap-3 px-4 py-3.5 shadow-sm">
      {/* Rank */}
      <span className="text-xs font-bold text-gray-300 w-6 shrink-0">#{rank}</span>

      {/* Circular image */}
      <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center border border-gray-100">
        {imageUrl && !imgError ? (
          <img
            src={imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <Package size={18} className="text-gray-300" />
        )}
      </div>

      {/* Name + stock */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">{product.name}</p>
        <p className="text-xs text-gray-400 mt-0.5">{product.stock} in stock</p>
      </div>

      {/* Growth indicator */}
      <div className="flex items-center gap-1 shrink-0">
        <BarChart2 size={14} className="text-teal-500" />
        <span
          className={`text-xs font-semibold ${
            product.isActive ? 'text-teal-600' : 'text-gray-400'
          }`}
        >
          {product.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>
    </div>
  );
}

function ProductRowSkeleton(): JSX.Element {
  return (
    <div className="bg-white rounded-2xl flex items-center gap-3 px-4 py-3.5 shadow-sm animate-pulse">
      <div className="w-6 h-3 bg-gray-100 rounded" />
      <div className="w-12 h-12 rounded-full bg-gray-100 shrink-0" />
      <div className="flex-1">
        <div className="h-3.5 bg-gray-100 rounded w-3/4 mb-2" />
        <div className="h-3 bg-gray-100 rounded w-1/3" />
      </div>
      <div className="h-4 w-14 bg-gray-100 rounded" />
    </div>
  );
}
