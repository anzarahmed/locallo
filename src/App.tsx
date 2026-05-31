import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ToastProvider } from './hooks/useToast';
import Toaster from './components/ui/Toaster';
import Login from './pages/auth/Login';
import VerifyOtp from './pages/auth/VerifyOtp';
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

function Dashboard(): JSX.Element {
  const { logout, seller } = useAuth();
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-600 mb-4">Welcome, {seller?.fullName ?? 'Seller'}!</p>
        <button
          onClick={logout}
          className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm"
        >
          Logout
        </button>
      </div>
    </div>
  );
}

function AppRoutes(): JSX.Element {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <GuestGuard>
            <Login />
          </GuestGuard>
        }
      />
      <Route
        path="/verify-otp"
        element={
          <GuestGuard>
            <VerifyOtp />
          </GuestGuard>
        }
      />
      <Route
        path="/dashboard"
        element={
          <AuthGuard>
            <Dashboard />
          </AuthGuard>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App(): JSX.Element {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
        <Toaster />
      </ToastProvider>
    </BrowserRouter>
  );
}
