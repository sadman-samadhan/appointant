'use client';

import React, { createContext, useContext, useState } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}

interface ToastContextType {
  toasts: ToastMessage[];
  addToast: (type: ToastType, title: string, description?: string) => void;
  removeToast: (id: string) => void;
  showSuccess: (title: string, description?: string) => void;
  showError: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: ToastType, title: string, description?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastMessage = { id, type, title, description };
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const showSuccess = (title: string, description?: string) => addToast('success', title, description);
  const showError = (title: string, description?: string) => addToast('error', title, description);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, showSuccess, showError }}>
      {children}
      {/* Toast Notification Container */}
      <div className="fixed bottom-5 right-5 z-[10000] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-xl shadow-lg border backdrop-blur-md transition-all duration-300 animate-fade-in flex items-start justify-between gap-3 ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-100 border-emerald-800'
                : toast.type === 'error'
                ? 'bg-rose-950/90 text-rose-100 border-rose-800'
                : toast.type === 'warning'
                ? 'bg-amber-950/90 text-amber-100 border-amber-800'
                : 'bg-slate-900/90 text-slate-100 border-slate-700'
            }`}
          >
            <div>
              <p className="text-xs font-bold">{toast.title}</p>
              {toast.description && <p className="text-[11px] opacity-80 mt-0.5">{toast.description}</p>}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-xs opacity-60 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
