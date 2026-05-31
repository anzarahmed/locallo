import type { JSX, ReactNode } from 'react';
import { ShieldCheck } from 'lucide-react';
import logo from '../../assets/logo.png';

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps): JSX.Element {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Gradient header block */}
      <div
        className="w-full flex flex-col items-center justify-center pt-14 pb-16 px-6"
        style={{
          background: 'linear-gradient(160deg, #FFB300 0%, #FF6200 45%, #E53000 100%)',
          borderRadius: '0 0 36px 36px',
          minHeight: '42vh',
        }}
      >
        <img
          src={logo}
          alt="Loccalo"
          className="h-20 w-auto mb-5"
        />
        <h1 className="text-[22px] font-bold text-white tracking-tight">Welcome to Loccalo</h1>
        <p className="mt-1.5 text-sm text-white/75">Discover local products you'll love</p>
      </div>

      {/* Form area */}
      <div className="flex-1 flex flex-col px-6 pt-8 pb-6 max-w-md w-full mx-auto">
        {children}
      </div>

      {/* Footer */}
      <div className="pb-8 flex items-center justify-center gap-1.5 text-xs text-gray-400">
        <ShieldCheck size={13} />
        <span>Your data is secure with us</span>
      </div>
    </div>
  );
}
