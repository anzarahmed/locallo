import { createContext, useContext, useState, useEffect, useCallback, type ReactNode, type JSX } from 'react';
import type { Admin, AuthState, PermissionMap, PermissionModule, PermissionAction } from '../types';
import * as authService from '../services/authService';
import { apiGet } from '../lib/axios';
import { PATHS } from '../api/paths';

interface AuthContextType extends AuthState {
  isRestoring: boolean;
  permissions: PermissionMap;
  hasPermission: (module: PermissionModule, action: PermissionAction) => boolean;
  refreshPermissions: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

async function fetchPermissions(): Promise<PermissionMap> {
  try {
    return await apiGet<PermissionMap>(PATHS.ME.PERMISSIONS);
  } catch {
    return {};
  }
}

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [state, setState] = useState<AuthState>({ admin: null, token: null });
  const [permissions, setPermissions] = useState<PermissionMap>({});
  const [isRestoring, setIsRestoring] = useState<boolean>(true);

  // On mount: restore session and fetch permissions fresh from API (no localStorage cache)
  useEffect((): void => {
    const token = localStorage.getItem('admin_token');
    const adminJson = localStorage.getItem('admin_user');
    if (token && adminJson) {
      setState({ token, admin: JSON.parse(adminJson) as Admin });
      fetchPermissions().then(perms => {
        setPermissions(perms);
        setIsRestoring(false);
      });
    } else {
      setIsRestoring(false);
    }
  }, []);

  // Re-fetch permissions when the tab regains focus
  useEffect((): (() => void) => {
    function onVisibilityChange(): void {
      if (document.visibilityState === 'visible' && localStorage.getItem('admin_token')) {
        void fetchPermissions().then(setPermissions);
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  const refreshPermissions = useCallback(async (): Promise<void> => {
    if (!localStorage.getItem('admin_token')) return;
    const perms = await fetchPermissions();
    setPermissions(perms);
  }, []);

  async function login(email: string, password: string): Promise<void> {
    const { token, admin } = await authService.login(email, password);
    localStorage.setItem('admin_token', token);
    localStorage.setItem('admin_user', JSON.stringify(admin));
    setState({ token, admin });
    const perms = await fetchPermissions();
    setPermissions(perms);
  }

  function logout(): void {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setState({ token: null, admin: null });
    setPermissions({});
  }

  function hasPermission(module: PermissionModule, action: PermissionAction): boolean {
    if (state.admin?.role === 'super_admin') return true;
    return permissions[module]?.includes(action) ?? false;
  }

  return (
    <AuthContext.Provider value={{ ...state, isRestoring, permissions, hasPermission, refreshPermissions, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
