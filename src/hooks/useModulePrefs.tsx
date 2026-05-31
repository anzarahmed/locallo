import { createContext, useContext, useState, type JSX, type ReactNode } from 'react';

interface ModulePrefs {
  showPnl: boolean;
  setShowPnl: (v: boolean) => void;
}

const ModulePrefsContext = createContext<ModulePrefs | null>(null);

export function ModulePrefsProvider({ children }: { children: ReactNode }): JSX.Element {
  const [showPnl, setShowPnlState] = useState<boolean>(() => {
    return localStorage.getItem('pref_show_pnl') !== 'false';
  });

  function setShowPnl(v: boolean): void {
    localStorage.setItem('pref_show_pnl', String(v));
    setShowPnlState(v);
  }

  return (
    <ModulePrefsContext.Provider value={{ showPnl, setShowPnl }}>
      {children}
    </ModulePrefsContext.Provider>
  );
}

export function useModulePrefs(): ModulePrefs {
  const ctx = useContext(ModulePrefsContext);
  if (!ctx) throw new Error('useModulePrefs must be used within ModulePrefsProvider');
  return ctx;
}
