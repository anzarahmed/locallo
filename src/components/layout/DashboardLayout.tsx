import { type JSX } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '../../hooks/useAuth';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/sellers': 'Sellers',
  '/sellers/add': 'Add Seller',
};

function resolveTitle(pathname: string): string {
  return (
    Object.entries(PAGE_TITLES)
      .filter(([path]) => pathname.startsWith(path))
      .sort((a, b) => b[0].length - a[0].length)[0]?.[1] ?? 'Admin'
  );
}

export default function DashboardLayout(): JSX.Element {
  const { token } = useAuth();
  const location = useLocation();

  if (!token) return <Navigate to="/login" replace />;

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
