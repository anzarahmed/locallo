import { createContext, useContext, useState, useCallback, useMemo, useRef, type JSX } from 'react';

type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

export interface ToastContextValue {
  toasts: ToastItem[];
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  // Source of truth for dedupe — mutated synchronously in push/dismiss so two
  // near-simultaneous calls (StrictMode double-invoked effects, or two requests
  // failing at once) always see each other's writes, unlike a ref synced from
  // `toasts` via a separate effect (which lags a render behind).
  const toastsRef = useRef<ToastItem[]>([]);

  const dismiss = useCallback((id: string): void => {
    toastsRef.current = toastsRef.current.filter((t) => t.id !== id);
    setToasts(toastsRef.current);
  }, []);

  const push = useCallback((type: ToastType, message: string): void => {
    if (toastsRef.current.some((t) => t.type === type && t.message === message)) return;
    const id = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
    toastsRef.current = [...toastsRef.current, { id, type, message }];
    setToasts(toastsRef.current);
    setTimeout(() => {
      toastsRef.current = toastsRef.current.filter((t) => t.id !== id);
      setToasts(toastsRef.current);
    }, 3500);
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      toasts,
      success: (msg) => push('success', msg),
      error: (msg) => push('error', msg),
      info: (msg) => push('info', msg),
      dismiss,
    }),
    [toasts, push, dismiss],
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
