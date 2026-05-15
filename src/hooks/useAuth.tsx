import { createContext, useContext, useState, useEffect, type ReactNode, type JSX } from 'react';
import type { Admin, AuthState } from '../types';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const MOCK_ADMIN: Admin = {
  id: 1,
  email: 'admin@localo.com',
  name: 'Super Admin',
  role: 'super_admin',
};

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [state, setState] = useState<AuthState>({
    admin: null,
    token: null,
  });

  useEffect((): void => {
    const token = localStorage.getItem('admin_token');
    const adminJson = localStorage.getItem('admin_user');
    if (token && adminJson) {
      setState({ token, admin: JSON.parse(adminJson) as Admin });
    }
  }, []);

  async function login(email: string, password: string): Promise<void> {
    if (email === 'admin@localo.com' && password === 'password') {
      const token = 'mock-jwt-token';
      localStorage.setItem('admin_token', token);
      localStorage.setItem('admin_user', JSON.stringify(MOCK_ADMIN));
      setState({ token, admin: MOCK_ADMIN });
    } else {
      throw new Error('Invalid email or password');
    }
  }

  function logout(): void {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setState({ token: null, admin: null });
  }

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
