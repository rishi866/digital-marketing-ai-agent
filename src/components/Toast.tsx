"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

type ToastKind = "success" | "error" | "info" | "loading";
interface ToastItem { id: number; kind: ToastKind; message: string; duration: number; }

interface ToastCtx {
  show: (kind: ToastKind, message: string, duration?: number) => number;
  success: (msg: string, duration?: number) => number;
  error: (msg: string, duration?: number) => number;
  info: (msg: string, duration?: number) => number;
  loading: (msg: string) => number;
  dismiss: (id: number) => void;
}

const Ctx = createContext<ToastCtx | null>(null);

let toastIdCounter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setItems(prev => prev.filter(t => t.id !== id));
  }, []);

  const show = useCallback((kind: ToastKind, message: string, duration = 3500) => {
    const id = ++toastIdCounter;
    setItems(prev => [...prev, { id, kind, message, duration }]);
    if (kind !== "loading" && duration > 0) {
      setTimeout(() => setItems(prev => prev.filter(t => t.id !== id)), duration);
    }
    return id;
  }, []);

  const value: ToastCtx = {
    show,
    success: (m, d) => show("success", m, d),
    error: (m, d) => show("error", m, d ?? 5000),
    info: (m, d) => show("info", m, d),
    loading: (m) => show("loading", m, 0),
    dismiss,
  };

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {items.map(t => (
          <div key={t.id} className={`pointer-events-auto rounded-xl shadow-lg border px-4 py-3 max-w-sm flex items-start gap-3 animate-in slide-in-from-bottom-2 fade-in duration-200 ${
            t.kind === "success" ? "bg-green-50 border-green-200 text-green-800"
              : t.kind === "error" ? "bg-red-50 border-red-200 text-red-800"
              : t.kind === "loading" ? "bg-blue-50 border-blue-200 text-blue-800"
              : "bg-slate-50 border-slate-200 text-slate-800"
          }`}>
            <span className="text-lg leading-none mt-0.5">
              {t.kind === "success" ? "✅" : t.kind === "error" ? "❌" : t.kind === "loading" ? "⏳" : "💡"}
            </span>
            <span className="text-sm flex-1 leading-relaxed">{t.message}</span>
            <button onClick={() => dismiss(t.id)} className="text-slate-400 hover:text-slate-700 text-xs">×</button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): ToastCtx {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Graceful fallback so components that render outside the provider don't crash
    return {
      show: () => 0,
      success: (m: string) => { if (typeof window !== "undefined") console.log("[toast]", m); return 0; },
      error: (m: string) => { if (typeof window !== "undefined") console.error("[toast]", m); return 0; },
      info: (m: string) => { if (typeof window !== "undefined") console.log("[toast]", m); return 0; },
      loading: (m: string) => { if (typeof window !== "undefined") console.log("[toast]", m); return 0; },
      dismiss: () => {},
    };
  }
  return ctx;
}

// Convenience: wrap an async action with start/success/error toasts
export function useToastAction() {
  const toast = useToast();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(async <T,>(fn: () => Promise<T>, msgs: { loading: string; success: string; error?: string }) => {
    const id = toast.loading(msgs.loading);
    try {
      const result = await fn();
      toast.dismiss(id);
      toast.success(msgs.success);
      return result;
    } catch (e) {
      toast.dismiss(id);
      toast.error(msgs.error ?? (e instanceof Error ? e.message : "Something went wrong"));
      throw e;
    }
  }, [toast]);
}

export function useEscToDismiss(onDismiss: () => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onDismiss(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onDismiss]);
}
