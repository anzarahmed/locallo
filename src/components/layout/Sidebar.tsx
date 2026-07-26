import { NavLink, useNavigate } from 'react-router-dom';
import logoUrl from '../../assets/logo.png';
import {
  LayoutDashboard,
  Users,
  Tag,
  Tags,
  Package,
  Image,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  UserCog,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { useState, type JSX } from 'react';
import { useAuth } from '../../hooks/useAuth';
import type { PermissionModule, PermissionAction } from '../../types';

interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
  permission?: { module: PermissionModule; action: PermissionAction };
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard'  },
  { to: '/sellers',    icon: Users,            label: 'Sellers',    permission: { module: 'sellers',    action: 'list' } },
  { to: '/products',   icon: Package,          label: 'Products',   permission: { module: 'products',   action: 'list' } },
  { to: '/categories', icon: Tag,              label: 'Categories', permission: { module: 'categories', action: 'list' } },
  { to: '/brands',     icon: Tags,             label: 'Brands',     permission: { module: 'brands',     action: 'list' } },
  { to: '/banners',    icon: Image,            label: 'Banners',    permission: { module: 'banners',    action: 'list' } },
  { to: '/customers',  icon: UserRound,        label: 'Customers',  permission: { module: 'customers',  action: 'list' } },
];

const TEAM_ITEMS: NavItem[] = [
  { to: '/sub-admins',       icon: UserCog,     label: 'Sub-Admins'       },
  { to: '/role-permissions', icon: ShieldCheck, label: 'Role Permissions' },
];

function NavItemLink({ item, collapsed }: { item: NavItem; collapsed: boolean }): JSX.Element {
  const { to, icon: Icon, label } = item;
  return (
    <NavLink
      to={to}
      className={({ isActive }: { isActive: boolean }): string =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? 'bg-indigo-600 text-white'
            : 'text-gray-400 hover:bg-gray-800 hover:text-white'
        } ${collapsed ? 'justify-center' : ''}`
      }
      title={collapsed ? label : undefined}
    >
      <Icon className="w-5 h-5 shrink-0" />
      {!collapsed && <span>{label}</span>}
    </NavLink>
  );
}

export default function Sidebar(): JSX.Element {
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const { logout, admin, hasPermission } = useAuth();
  const navigate = useNavigate();
  const isSuperAdmin = admin?.role === 'super_admin';

  const visibleNavItems = NAV_ITEMS.filter(item =>
    !item.permission || hasPermission(item.permission.module, item.permission.action),
  );

  function handleLogout(): void {
    logout();
    navigate('/login');
  }

  return (
    <aside
      className={`relative flex flex-col bg-gray-900 text-white transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div className={`flex items-center px-4 py-5 border-b border-gray-700 ${collapsed ? 'justify-center' : ''}`}>
        <img
          src={logoUrl}
          alt="Localo"
          className={`object-contain ${collapsed ? 'h-8 w-8' : 'h-10 w-auto'}`}
        />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {visibleNavItems.map(item => (
          <NavItemLink key={item.to} item={item} collapsed={collapsed} />
        ))}

        {isSuperAdmin && (
          <>
            {!collapsed && (
              <p className="px-3 pt-4 pb-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Team
              </p>
            )}
            {collapsed && <div className="my-2 border-t border-gray-700" />}
            {TEAM_ITEMS.map(item => (
              <NavItemLink key={item.to} item={item} collapsed={collapsed} />
            ))}
          </>
        )}
      </nav>

      {/* User + Logout */}
      <div className="border-t border-gray-700 p-3">
        {!collapsed && (
          <div className="flex items-center gap-2 px-2 py-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold shrink-0">
              {admin?.email.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{admin?.email}</p>
              <p className="text-xs text-gray-400 truncate capitalize">{admin?.role.replace('_', ' ')}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors ${
            collapsed ? 'justify-center' : ''
          }`}
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={(): void => setCollapsed(c => !c)}
        className="absolute -right-3 top-6 w-6 h-6 bg-gray-900 border border-gray-700 rounded-full flex items-center justify-center text-gray-400 hover:text-white z-10"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed
          ? <ChevronRight className="w-3.5 h-3.5" />
          : <ChevronLeft className="w-3.5 h-3.5" />
        }
      </button>
    </aside>
  );
}
