import { createContext, useContext, useState, useEffect, type ReactNode, type JSX } from 'react';
import type { Admin, AuthState } from '../types';

interface AuthContextType extends AuthState {
  isRestoring: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [state, setState] = useState<AuthState>({
    admin: null,
    token: null,
  });
  const [isRestoring, setIsRestoring] = useState<boolean>(true);

  useEffect((): void => {
    const token = localStorage.getItem('admin_token');
    const adminJson = localStorage.getItem('admin_user');
    if (token && adminJson) {
      setState({ token, admin: JSON.parse(adminJson) as Admin });
    }
    setIsRestoring(false);
  }, []);

  async function login(email: string, password: string): Promise<void> {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admins/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json() as { message?: string; token?: string; admin?: Admin };

    if (!res.ok) {
      throw new Error(data.message ?? 'Login failed. Please try again.');
    }

    const token = data.token as string;
    const admin = data.admin as Admin;

    localStorage.setItem('admin_token', token);
    localStorage.setItem('admin_user', JSON.stringify(admin));
    setState({ token, admin });
  }

  function logout(): void {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setState({ token: null, admin: null });
  }

  return (
    <AuthContext.Provider value={{ ...state, isRestoring, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
