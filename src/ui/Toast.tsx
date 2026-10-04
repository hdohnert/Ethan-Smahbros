import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

type Kind = 'info' | 'error';
const Ctx = createContext<(msg: string, kind?: Kind) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ msg: string; kind: Kind; key: number } | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const show = useCallback((msg: string, kind: Kind = 'info') => {
    window.clearTimeout(timer.current);
    setToast({ msg, kind, key: Date.now() });
    timer.current = window.setTimeout(() => setToast(null), kind === 'error' ? 5000 : 3000);
  }, []);
  return (
    <Ctx.Provider value={show}>
      {children}
      {toast && (
        <div key={toast.key} className={`toast toast--${toast.kind}`} role="status" onClick={() => setToast(null)}>
          {toast.msg}
        </div>
      )}
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);

/** Wraps an async action: shows its error as a toast and tracks busy state. */
export function useAction() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const run = useCallback(
    async <T,>(fn: () => Promise<T>, success?: string | ((r: T) => string)): Promise<T | undefined> => {
      setBusy(true);
      try {
        const r = await fn();
        if (success) toast(typeof success === 'function' ? success(r) : success);
        return r;
      } catch (e) {
        toast(e instanceof Error ? e.message : String(e), 'error');
        return undefined;
      } finally {
        setBusy(false);
      }
    },
    [toast],
  );
  return { busy, run };
}
