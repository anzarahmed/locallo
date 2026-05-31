import { createContext, useContext, useState, useEffect, type ReactNode, type JSX } from 'react';
import type { AuthState, Seller } from '../types';

interface AuthContextValue extends AuthState {
  isRestoring: boolean;
  login: (token: string, seller: Seller) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [isRestoring, setIsRestoring] = useState(true);
  const [state, setState] = useState<AuthState>({ seller: null, token: null });

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

  return (
    <AuthContext.Provider value={{ ...state, isRestoring, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
