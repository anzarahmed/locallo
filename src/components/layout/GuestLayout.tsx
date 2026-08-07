import { type JSX } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';
import { useAuth } from '../../hooks/useAuth';

const RECAPTCHA_SITE_KEY: string = import.meta.env.VITE_RECAPTCHA_SITE_KEY ?? '';

export default function GuestLayout(): JSX.Element {
  const { token, isRestoring } = useAuth();

  if (isRestoring) return <></>;
  if (token) return <Navigate to="/dashboard" replace />;

  return (
    <GoogleReCaptchaProvider
      reCaptchaKey={RECAPTCHA_SITE_KEY}
      scriptProps={{ async: true, defer: true, appendTo: 'head' }}
    >
      <Outlet />
    </GoogleReCaptchaProvider>
  );
}
