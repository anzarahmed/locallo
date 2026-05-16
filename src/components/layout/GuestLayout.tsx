import { type JSX } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function GuestLayout(): JSX.Element {
  const { token, isRestoring } = useAuth();

  if (isRestoring) return <></>;
  if (token) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}
