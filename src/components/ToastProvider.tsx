import React, { createContext, useCallback, useContext, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, Save, X, XCircle } from 'lucide-react';

export type ToastVariant = 'success' | 'warning' | 'error' | 'info' | 'saved';

export interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
  durationMs: number;
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant, durationMs?: number) => void;
  success: (message: string) => void;
  warning: (message: string) => void;
  error: (message: string, persistent?: boolean) => void;
  info: (message: string) => void;
  saved: (message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = 'info', durationMs = 3600) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev.slice(-3), { id, message, variant, durationMs }]);
      if (durationMs > 0) {
        window.setTimeout(() => dismiss(id), durationMs);
      }
    },
    [dismiss]
  );

  const value: ToastContextValue = {
    showToast,
    success: (m) => showToast(m, 'success', 3400),
    warning: (m) => showToast(m, 'warning', 4500),
    error: (m, persistent = false) => showToast(m, 'error', persistent ? 0 : 6000),
    info: (m) => showToast(m, 'info', 3400),
    saved: (m = 'Đã lưu thay đổi') => showToast(m, 'saved', 2600),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="app-toast-container no-print fixed bottom-5 right-5 sm:top-20 sm:bottom-auto z-[70] flex flex-col gap-2.5 w-[calc(100vw-2.5rem)] max-w-md pointer-events-none"
      >
        {toasts.map((t) => {
          const styleMap: Record<ToastVariant, string> = {
            success: 'border-[#16A34A]/30 bg-white text-[#0F172A] shadow-lg',
            saved: 'border-[#2563EB]/30 bg-white text-[#0F172A] shadow-lg',
            warning: 'border-[#D97706]/40 bg-amber-50 text-amber-950 shadow-lg',
            error: 'border-[#DC2626]/40 bg-rose-50 text-rose-950 shadow-lg',
            info: 'border-[#0EA5E9]/35 bg-white text-[#0F172A] shadow-lg',
          };
          const iconMap: Record<ToastVariant, React.ReactNode> = {
            success: <CheckCircle2 className="w-5 h-5 text-[#16A34A] shrink-0" />,
            saved: <Save className="w-5 h-5 text-[#2563EB] shrink-0" />,
            warning: <AlertTriangle className="w-5 h-5 text-[#D97706] shrink-0" />,
            error: <XCircle className="w-5 h-5 text-[#DC2626] shrink-0" />,
            info: <Info className="w-5 h-5 text-[#0EA5E9] shrink-0" />,
          };

          return (
            <div
              key={t.id}
              role="status"
              className={`animate-toast-in pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3.5 text-base ${styleMap[t.variant]}`}
            >
              <span className="mt-0.5">{iconMap[t.variant]}</span>
              <span className="flex-1 text-[15px] font-medium leading-snug">{t.message}</span>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 shrink-0"
                aria-label="Đóng thông báo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}
