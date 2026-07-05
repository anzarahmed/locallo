import { createContext, useContext, useState, useEffect, useRef, type ReactNode, type JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AuthState, Seller } from '../types';

interface AuthContextValue extends AuthState {
  isRestoring: boolean;
  login: (token: string, seller: Seller) => void;
  logout: () => void;
  updateSeller: (partial: Partial<Seller>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [isRestoring, setIsRestoring] = useState(true);
  const [state, setState] = useState<AuthState>({ seller: null, token: null });
  const navigate = useNavigate();
  const logoutRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    const token = localStorage.getItem('seller_token');
    const raw = localStorage.getItem('seller_user');
    if (token && raw) {
      try {
        setState({ token, seller: JSON.parse(raw) as Seller });
      } catch {
        localStorage.removeItem('seller_token');
        localStorage.removeItem('seller_user');
      }
    }
    setIsRestoring(false);
  }, []);

  function login(token: string, seller: Seller): void {
    localStorage.setItem('seller_token', token);
    localStorage.setItem('seller_user', JSON.stringify(seller));
    setState({ token, seller });
  }

  function logout(): void {
    localStorage.removeItem('seller_token');
    localStorage.removeItem('seller_user');
    setState({ token: null, seller: null });
  }

  logoutRef.current = logout;

  useEffect((): (() => void) => {
    function onUnauthorized(): void {
      logoutRef.current();
      navigate('/login', { replace: true });
    }
    window.addEventListener('seller:unauthorized', onUnauthorized);
    return () => window.removeEventListener('seller:unauthorized', onUnauthorized);
  }, [navigate]);

  function updateSeller(partial: Partial<Seller>): void {
    setState((prev) => {
      if (!prev.seller) return prev;
      const updated = { ...prev.seller, ...partial };
      localStorage.setItem('seller_user', JSON.stringify(updated));
      return { ...prev, seller: updated };
    });
  }

  return (
    <AuthContext.Provider value={{ ...state, isRestoring, login, logout, updateSeller }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
