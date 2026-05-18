import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { create } from 'zustand';

// ─── Toast Store ───────────────────────────────────────────────────────
export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number; // ms, default 5000
}

interface ToastStore {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));
    // Auto-remove after duration
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, toast.duration || 5000);
  },
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));

// ─── Inline keyframes (injected once) ──────────────────────────────────
const STYLE_ID = 'toast-keyframes';
if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes toast-slide-in {
      from { transform: translateX(110%); opacity: 0; }
      to   { transform: translateX(0);    opacity: 1; }
    }
    .toast-enter {
      animation: toast-slide-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
  `;
  document.head.appendChild(style);
}

// ─── Single Toast ──────────────────────────────────────────────────────
const iconMap = {
  success: <CheckCircle2 size={18} className="text-emerald-500" />,
  error: <AlertCircle size={18} className="text-red-500" />,
  info: <Info size={18} className="text-blue-500" />,
};

const barColorMap = {
  success: 'bg-emerald-500',
  error: 'bg-red-500',
  info: 'bg-blue-500',
};

const borderColorMap = {
  success: 'border-l-emerald-500',
  error: 'border-l-red-500',
  info: 'border-l-blue-500',
};

const ToastNotification: React.FC<{ toast: ToastItem; onClose: () => void }> = ({ toast, onClose }) => {
  const [progress, setProgress] = useState(100);
  const duration = toast.duration || 5000;

  useEffect(() => {
    const interval = 30;
    const step = (interval / duration) * 100;
    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev - step;
        return next <= 0 ? 0 : next;
      });
    }, interval);
    return () => clearInterval(timer);
  }, [duration]);

  return (
    <div
      className={clsx(
        'toast-enter relative w-72 sm:w-80 rounded-xl overflow-hidden shadow-2xl border border-l-4 pointer-events-auto',
        'bg-white dark:bg-slate-800',
        'border-gray-200 dark:border-slate-700',
        borderColorMap[toast.type],
      )}
    >
      <div className="flex items-start gap-3 p-4">
        <div className="flex-shrink-0 mt-0.5">{iconMap[toast.type]}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{toast.title}</p>
          {toast.message && (
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 leading-relaxed">{toast.message}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 p-0.5 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 dark:text-slate-500 transition-colors"
        >
          <X size={14} />
        </button>
      </div>
      {/* Progress bar */}
      <div className="h-0.5 w-full bg-gray-100 dark:bg-slate-700">
        <div
          className={clsx('h-full transition-all ease-linear', barColorMap[toast.type])}
          style={{ width: `${progress}%`, transitionDuration: '30ms' }}
        />
      </div>
    </div>
  );
};

// ─── Toast Container ───────────────────────────────────────────────────
export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 sm:top-24 right-3 sm:right-6 z-[100] flex flex-col gap-3 pointer-events-none lg:right-8">
      {toasts.map((toast) => (
        <ToastNotification
          key={toast.id}
          toast={toast}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
};
