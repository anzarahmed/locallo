import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, Plus, LogOut, BarChart2, User, ChevronDown, Settings, Receipt, Bell, BadgePercent, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useModulePrefs } from '../../hooks/useModulePrefs';
import { useState, useRef, useEffect, type JSX } from 'react';
import logo from '../../assets/logo.png';
import { getNotifications } from '../../services/notificationService';
import { getProfile } from '../../services/sellerService';
import { resolveImage } from '../../lib/imageUtils';

interface NavItem {
  to: string;
  icon: JSX.Element;
  label: string;
}

const BASE_NAV: NavItem[] = [
  { to: '/dashboard',  icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
  { to: '/products',   icon: <Package size={20} />,         label: 'Products'  },
  { to: '/sold-logs',  icon: <Receipt size={20} />,         label: 'Sales Log' },
  { to: '/offers',     icon: <BadgePercent size={20} />,    label: 'Offers'    },
];

const PNL_NAV:      NavItem = { to: '/pnl',      icon: <BarChart2 size={20} />, label: 'P&L'      };
const PROFILE_NAV:  NavItem = { to: '/profile',  icon: <User size={20} />,     label: 'Profile'  };
const SETTINGS_NAV: NavItem = { to: '/settings', icon: <Settings size={20} />, label: 'Settings' };

export default function AppLayout(): JSX.Element {
  const { logout, seller } = useAuth();
  const { showPnl } = useModulePrefs();
  const navigate = useNavigate();
  const [hasUnread, setHasUnread] = useState(false);
  const [kycPending, setKycPending] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);

  useEffect(() => {
    getNotifications({ page: 1, limit: 50 })
      .then(data => setHasUnread(data.notifications.some(n => !n.isRead)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    getProfile()
      .then(data => { setKycPending(!data.profile.isVerified); setPhoto(data.photo); })
      .catch(() => {});
  }, []);

  const sidebarNav = [...BASE_NAV, ...(showPnl ? [PNL_NAV] : [])];
  const mobileNav  = [...BASE_NAV, ...(showPnl ? [PNL_NAV] : []), PROFILE_NAV, SETTINGS_NAV];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex flex-col w-60 bg-white border-r border-gray-100 fixed top-0 left-0 h-screen z-30">
        {/* Logo */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center">
          <img src={logo} alt="Loccalo" className="h-9 w-auto" />
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {sidebarNav.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-teal-50 text-teal-700'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                }`
              }
            >
              {icon}
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Add product CTA */}
        <div className="px-4 pb-5">
          <button
            onClick={() => navigate('/products/add')}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #1B9E98 0%, #157A75 100%)' }}
          >
            <Plus size={16} />
            Add Product
          </button>
        </div>
      </aside>

      {/* ── Content column (offset for fixed desktop sidebar) ── */}
      <div className="flex-1 md:ml-60 flex flex-col min-h-screen">
        {/* ── Top bar ── */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-100 flex items-center justify-between px-4 md:px-6 py-2.5">
          <img src={logo} alt="Loccalo" className="h-7 w-auto md:hidden" />
          <div className="flex items-center gap-2 ml-auto">
            <NotificationBell hasUnread={hasUnread} onClick={() => navigate('/notifications')} />
            <ProfileMenu seller={seller} photo={photo} logout={logout} navigate={navigate} />
          </div>
        </header>

        {kycPending && <KycPendingBanner />}

        {/* ── Main content ── */}
        <main className="flex-1 pb-20 md:pb-0">
          <Outlet />
        </main>
      </div>

      {/* ── Mobile bottom nav ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-30 flex items-center justify-around px-2 py-2">
        {mobileNav.slice(0, 2).map(({ to, icon, label }) => (
          <MobileNavItem key={to} to={to} icon={icon} label={label} />
        ))}

        {/* FAB */}
        <button
          onClick={() => navigate('/products/add')}
          className="flex items-center justify-center w-14 h-14 rounded-full text-white shadow-lg -mt-6 transition-opacity hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #1B9E98 0%, #157A75 100%)' }}
        >
          <Plus size={22} />
        </button>

        {mobileNav.slice(2).map(({ to, icon, label }) => (
          <MobileNavItem key={to} to={to} icon={icon} label={label} />
        ))}
      </nav>
    </div>
  );
}

/* ── KYC pending banner ── */
function KycPendingBanner(): JSX.Element {
  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-start sm:items-center gap-2.5">
      <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
      <p className="text-xs sm:text-sm text-amber-800 leading-snug">
        <span className="font-semibold">Your KYC verification is pending.</span>{' '}
        Please complete your KYC — until it's verified, your products won't be visible to customers.
      </p>
    </div>
  );
}

/* ── Notification bell ── */
interface NotificationBellProps {
  hasUnread: boolean;
  onClick: () => void;
}

function NotificationBell({ hasUnread, onClick }: NotificationBellProps): JSX.Element {
  return (
    <button
      onClick={onClick}
      aria-label="Notifications"
      className="relative flex items-center justify-center w-9 h-9 rounded-full text-gray-400 hover:text-teal-600 hover:bg-gray-50 transition-colors"
    >
      <Bell size={18} />
      {hasUnread && (
        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
      )}
    </button>
  );
}

/* ── Profile menu (desktop) ── */
interface ProfileMenuProps {
  seller: ReturnType<typeof useAuth>['seller'];
  photo: string | null;
  logout: () => void;
  navigate: (path: string) => void;
}

function ProfileMenu({ seller, photo, logout, navigate }: ProfileMenuProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const initial = (seller?.businessName ?? seller?.fullName ?? seller?.mobile ?? 'S')[0].toUpperCase();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 group cursor-pointer"
        aria-label="Profile menu"
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #1B9E98 0%, #157A75 100%)' }}
        >
          {photo ? (
            <img src={resolveImage(photo)} alt="" className="w-full h-full object-cover" />
          ) : (
            initial
          )}
        </div>
        <ChevronDown
          size={14}
          className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
          {/* Seller name header */}
          <div className="px-4 py-2.5 border-b border-gray-50">
            <p className="text-xs font-semibold text-gray-800 truncate">
              {seller?.fullName ?? 'Seller'}
            </p>
            <p className="text-xs text-gray-400 truncate">{seller?.mobile}</p>
          </div>

          {/* Menu items */}
          <button
            onClick={() => { setOpen(false); navigate('/profile'); }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <User size={15} className="text-gray-400" />
            Profile
          </button>

          <button
            onClick={() => { setOpen(false); navigate('/settings'); }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <Settings size={15} className="text-gray-400" />
            Settings
          </button>

          <div className="border-t border-gray-50 mt-1 pt-1">
            <button
              onClick={() => { setOpen(false); logout(); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
            >
              <LogOut size={15} />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Mobile nav item ── */
function MobileNavItem({ to, icon, label }: NavItem): JSX.Element {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-xs font-medium transition-colors ${
          isActive ? 'text-teal-600' : 'text-gray-400'
        }`
      }
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}
