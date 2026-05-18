import { type JSX } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ToastProvider } from './hooks/useToast';
import Toaster from './components/ui/Toaster';
import DashboardLayout from './components/layout/DashboardLayout';
import GuestLayout from './components/layout/GuestLayout';
import Login from './pages/auth/Login';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import Dashboard from './pages/dashboard/Dashboard';
import SellerList from './pages/sellers/SellerList';
import SellerForm from './pages/sellers/SellerForm';
import CategoryList from './pages/categories/CategoryList';

export default function App(): JSX.Element {
  return (
    <ToastProvider>
      <Toaster />
      <AuthProvider>
        <BrowserRouter>
        <Routes>
          {/* Auth */}
          <Route element={<GuestLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
          </Route>

          {/* Protected */}
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/sellers" element={<SellerList />} />
            <Route path="/sellers/add" element={<SellerForm />} />
            <Route path="/sellers/:id/edit" element={<SellerForm />} />
            <Route path="/categories" element={<CategoryList />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}
