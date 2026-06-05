import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ToastProvider } from './hooks/useToast';
import { ModulePrefsProvider } from './hooks/useModulePrefs';
import Toaster from './components/ui/Toaster';
import AppLayout from './components/layout/AppLayout';
import Login from './pages/auth/Login';
import VerifyOtp from './pages/auth/VerifyOtp';
import Dashboard from './pages/dashboard/Dashboard';
import Profile from './pages/profile/Profile';
import ProductList from './pages/products/ProductList';
import AddProduct from './pages/products/AddProduct';
import EditProduct from './pages/products/EditProduct';
import VariantList from './pages/products/variants/VariantList';
import type { JSX } from 'react';

function AuthGuard({ children }: { children: JSX.Element }): JSX.Element {
  const { token, isRestoring } = useAuth();
  if (isRestoring) return <div className="min-h-screen bg-gray-50" />;
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function GuestGuard({ children }: { children: JSX.Element }): JSX.Element {
  const { token, isRestoring } = useAuth();
  if (isRestoring) return <div className="min-h-screen bg-gray-50" />;
  if (token) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes(): JSX.Element {
  return (
    <Routes>
      {/* Guest routes */}
      <Route path="/login"      element={<GuestGuard><Login /></GuestGuard>} />
      <Route path="/verify-otp" element={<GuestGuard><VerifyOtp /></GuestGuard>} />

      {/* Authenticated routes */}
      <Route element={<AuthGuard><AppLayout /></AuthGuard>}>
        <Route path="/dashboard"    element={<Dashboard />} />
        <Route path="/profile"      element={<Profile />} />
        <Route path="/products"          element={<ProductList />} />
        <Route path="/products/add"      element={<AddProduct />} />
        <Route path="/products/:id/edit"     element={<EditProduct />} />
        <Route path="/products/:id/variants" element={<VariantList />} />
        <Route path="/pnl"          element={<Placeholder title="P&L" />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function Placeholder({ title }: { title: string }): JSX.Element {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400 text-sm">{title} — coming soon</p>
    </div>
  );
}

export default function App(): JSX.Element {
  return (
    <BrowserRouter>
      <ToastProvider>
        <ModulePrefsProvider>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
          <Toaster />
        </ModulePrefsProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
