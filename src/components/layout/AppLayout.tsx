import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, User, Plus, LogOut, BarChart2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import logo from '../../assets/logo.png';
import type { JSX } from 'react';

interface NavItem {
  to: string;
  icon: JSX.Element;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard',  icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
  { to: '/products',   icon: <Package size={20} />,         label: 'Products'  },
  { to: '/pnl',        icon: <BarChart2 size={20} />,       label: 'P&L'       },
  { to: '/profile',    icon: <User size={20} />,            label: 'Profile'   },
];

export default function AppLayout(): JSX.Element {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex flex-col w-60 bg-white border-r border-gray-100 fixed top-0 left-0 h-screen z-30">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-gray-100">
          <img src={logo} alt="Loccalo" className="h-9 w-auto" />
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {NAV_ITEMS.map(({ to, icon, label }) => (
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
        <div className="px-4 pb-4">
          <button
            onClick={() => navigate('/products/add')}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #1B9E98 0%, #157A75 100%)' }}
          >
            <Plus size={16} />
            Add Product
          </button>
        </div>

        {/* Logout */}
        <div className="px-3 pb-5 border-t border-gray-100 pt-3">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors w-full"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 md:ml-60 pb-20 md:pb-0">
        <Outlet />
      </main>

      {/* ── Mobile bottom nav ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-30 flex items-center justify-around px-2 py-2">
        {NAV_ITEMS.slice(0, 2).map(({ to, icon, label }) => (
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

        {NAV_ITEMS.slice(2).map(({ to, icon, label }) => (
          <MobileNavItem key={to} to={to} icon={icon} label={label} />
        ))}
      </nav>
    </div>
  );
}

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
