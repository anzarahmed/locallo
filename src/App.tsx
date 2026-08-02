import { type JSX, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ToastProvider } from './hooks/useToast';
import Toaster from './components/ui/Toaster';
import DashboardLayout from './components/layout/DashboardLayout';
import GuestLayout from './components/layout/GuestLayout';

const Login = lazy(() => import('./pages/auth/Login'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'));
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'));
const SellerList = lazy(() => import('./pages/sellers/SellerList'));
const SellerForm = lazy(() => import('./pages/sellers/SellerForm'));
const CategoryList = lazy(() => import('./pages/categories/CategoryList'));
const BrandList = lazy(() => import('./pages/brands/BrandList'));
const BannerList = lazy(() => import('./pages/banners/BannerList'));
const FaqList = lazy(() => import('./pages/faqs/FaqList'));
const ProductList = lazy(() => import('./pages/products/ProductList'));
const CustomerList = lazy(() => import('./pages/customers/CustomerList'));
const SubAdminList = lazy(() => import('./pages/sub-admins/SubAdminList'));
const RoleList = lazy(() => import('./pages/sub-admins/RoleList'));
const RolePermissions = lazy(() => import('./pages/sub-admins/RolePermissions'));

export default function App(): JSX.Element {
  return (
    <ToastProvider>
      <Toaster />
      <BrowserRouter basename="/admin">
      <AuthProvider>
        <Suspense fallback={null}>
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
            <Route path="/products"          element={<ProductList />} />
            <Route path="/categories"       element={<CategoryList />} />
            <Route path="/brands"           element={<BrandList />} />
            <Route path="/banners"          element={<BannerList />} />
            <Route path="/faqs"             element={<FaqList />} />
            <Route path="/customers"        element={<CustomerList />} />
            <Route path="/sub-admins"                element={<SubAdminList />} />
            <Route path="/role-permissions"          element={<RoleList />} />
            <Route path="/role-permissions/:role"    element={<RolePermissions />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        </Suspense>
      </AuthProvider>
      </BrowserRouter>
    </ToastProvider>
  );
}
