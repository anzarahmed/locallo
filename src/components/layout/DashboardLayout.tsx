import { useEffect, type JSX } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '../../hooks/useAuth';
import type { PermissionModule, PermissionAction } from '../../types';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':         'Dashboard',
  '/sellers':           'Sellers',
  '/sellers/add':       'Add Seller',
  '/categories':        'Categories',
  '/products':          'Products',
  '/sub-admins':        'Sub-Admins',
  '/role-permissions':  'Role Permissions',
};

// Routes that require a specific permission to access
const ROUTE_PERMISSIONS: { prefix: string; module: PermissionModule; action: PermissionAction }[] = [
  { prefix: '/sellers',    module: 'sellers',    action: 'list' },
  { prefix: '/categories', module: 'categories', action: 'list' },
  { prefix: '/products',   module: 'products',   action: 'list' },
];

// Routes only accessible to super_admin
const SUPER_ADMIN_ONLY_PREFIXES = ['/sub-admins', '/role-permissions'];

function resolveTitle(pathname: string): string {
  return (
    Object.entries(PAGE_TITLES)
      .filter(([path]) => pathname.startsWith(path))
      .sort((a, b) => b[0].length - a[0].length)[0]?.[1] ?? 'Admin'
  );
}

export default function DashboardLayout(): JSX.Element {
  const { token, isRestoring, admin, hasPermission, refreshPermissions } = useAuth();
  const location = useLocation();

  useEffect((): void => {
    void refreshPermissions();
  }, [location.pathname, refreshPermissions]);

  if (isRestoring) return <></>;
  if (!token) return <Navigate to="/login" replace />;

  // Super-admin-only route guard
  if (SUPER_ADMIN_ONLY_PREFIXES.some(p => location.pathname.startsWith(p)) && admin?.role !== 'super_admin') {
    return <Navigate to="/dashboard" replace />;
  }

  // Permission-based route guard
  const blocked = ROUTE_PERMISSIONS.find(
    r => location.pathname.startsWith(r.prefix) && !hasPermission(r.module, r.action),
  );
  if (blocked) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={resolveTitle(location.pathname)} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
