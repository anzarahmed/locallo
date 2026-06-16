import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ToastProvider } from './hooks/useToast';
import { ModulePrefsProvider } from './hooks/useModulePrefs';
import Toaster from './components/ui/Toaster';
import type { JSX } from 'react';

const AppLayout   = lazy(() => import('./components/layout/AppLayout'));
const Login       = lazy(() => import('./pages/auth/Login'));
const VerifyOtp   = lazy(() => import('./pages/auth/VerifyOtp'));
const Dashboard   = lazy(() => import('./pages/dashboard/Dashboard'));
const Profile     = lazy(() => import('./pages/profile/Profile'));
const ProductList = lazy(() => import('./pages/products/ProductList'));
const AddProduct  = lazy(() => import('./pages/products/AddProduct'));
const EditProduct = lazy(() => import('./pages/products/EditProduct'));
const VariantList = lazy(() => import('./pages/products/variants/VariantList'));
const Settings    = lazy(() => import('./pages/settings/Settings'));
const SoldLogs    = lazy(() => import('./pages/sold-logs/SoldLogs'));

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

const PageFallback = (): JSX.Element => <div className="min-h-screen bg-gray-50" />;

function AppRoutes(): JSX.Element {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        {/* Guest routes */}
        <Route path="/login"      element={<GuestGuard><Login /></GuestGuard>} />
        <Route path="/verify-otp" element={<GuestGuard><VerifyOtp /></GuestGuard>} />

        {/* Authenticated routes */}
        <Route element={<AuthGuard><AppLayout /></AuthGuard>}>
          <Route path="/dashboard"             element={<Dashboard />} />
          <Route path="/profile"               element={<Profile />} />
          <Route path="/products"              element={<ProductList />} />
          <Route path="/products/add"          element={<AddProduct />} />
          <Route path="/products/:id/edit"     element={<EditProduct />} />
          <Route path="/products/:id/variants" element={<VariantList />} />
          <Route path="/settings"              element={<Settings />} />
          <Route path="/sold-logs"             element={<SoldLogs />} />
          <Route path="/pnl"                   element={<Placeholder title="P&L" />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
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
    <BrowserRouter basename="/seller">
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
