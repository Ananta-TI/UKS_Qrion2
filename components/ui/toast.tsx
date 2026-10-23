'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toast: {
    success: (message: string, title?: string) => void;
    error: (message: string, title?: string) => void;
    info: (message: string, title?: string) => void;
  };
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

function cleanUrlParam(param: string) {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.has(param)) {
      url.searchParams.delete(param);
      window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
    }
  } catch {}
}

function UrlToastListener({ addToast }: { addToast: (t: Omit<ToastItem, 'id'>) => void }) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const ok = searchParams?.get('ok');
    const err = searchParams?.get('error');

    if (ok) {
      addToast({ type: 'success', title: 'Berhasil', message: ok });
      cleanUrlParam('ok');
    }
    if (err) {
      addToast({ type: 'error', title: 'Gagal', message: err });
      cleanUrlParam('error');
    }
  }, [searchParams, addToast]);

  return null;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((t: Omit<ToastItem, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const duration = t.duration ?? 4500;
    const item: ToastItem = { ...t, id, duration };

    setToasts((prev) => [...prev.slice(-4), item]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const toast = {
    success: useCallback((message: string, title: string = 'Berhasil') => {
      addToast({ type: 'success', title, message });
    }, [addToast]),
    error: useCallback((message: string, title: string = 'Terjadi Kesalahan') => {
      addToast({ type: 'error', title, message });
    }, [addToast]),
    info: useCallback((message: string, title: string = 'Informasi') => {
      addToast({ type: 'info', title, message });
    }, [addToast]),
  };

  return (
    <ToastContext.Provider value={{ toast, removeToast }}>
      <Suspense fallback={null}>
        <UrlToastListener addToast={addToast} />
      </Suspense>
      {children}

      {/* Sticky Bottom-Right Toast Container */}
      <div
        className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm pointer-events-none"
        aria-live="polite"
        role="region"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.92, transition: { duration: 0.2 } }}
              transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              className={`pointer-events-auto w-full max-w-sm rounded-xl p-3.5 shadow-2xl border flex items-start gap-3 backdrop-blur-md bg-[var(--surface)] ${
                t.type === 'success'
                  ? 'border-emerald-500/40'
                  : t.type === 'error'
                  ? 'border-rose-500/40'
                  : 'border-sky-500/40'
              }`}
              style={{
                boxShadow:
                  '0 12px 28px -6px rgba(0, 0, 0, 0.25), 0 4px 12px -2px rgba(0, 0, 0, 0.1)',
              }}
            >
              <div className="shrink-0 mt-0.5">
                {t.type === 'success' && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                )}
                {t.type === 'error' && (
                  <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                )}
                {t.type === 'info' && (
                  <Info className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                )}
              </div>

              <div className="flex-1 min-w-0 pr-1">
                {t.title && (
                  <div
                    className={`font-semibold text-xs tracking-tight ${
                      t.type === 'success'
                        ? 'text-emerald-700 dark:text-emerald-300'
                        : t.type === 'error'
                        ? 'text-rose-700 dark:text-rose-300'
                        : 'text-sky-700 dark:text-sky-300'
                    }`}
                  >
                    {t.title}
                  </div>
                )}
                <div className="text-xs text-[var(--text)] mt-0.5 leading-relaxed break-words">
                  {t.message}
                </div>
              </div>

              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="shrink-0 -mr-1 -mt-1 p-1 rounded-md text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--well)] transition"
                aria-label="Tutup notifikasi"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      toast: {
        success: (m: string) => {
          if (typeof window !== 'undefined') console.log('[Toast Success]:', m);
        },
        error: (m: string) => {
          if (typeof window !== 'undefined') console.error('[Toast Error]:', m);
        },
        info: (m: string) => {
          if (typeof window !== 'undefined') console.log('[Toast Info]:', m);
        },
      },
      removeToast: () => {},
    };
  }
  return ctx;
}
