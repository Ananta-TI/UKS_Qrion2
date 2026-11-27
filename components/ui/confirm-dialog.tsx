'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, HelpCircle, Save, Trash2, X } from 'lucide-react';

type ConfirmTone = 'primary' | 'danger';

export type ConfirmOptions = {
  title: string;
  message: React.ReactNode;
  detail?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
};

type ConfirmRequest = {
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
};

type ConfirmContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      // Kalau ada permintaan lama yang belum dijawab, tutup sebagai batal.
      resolver.current?.(false);
      resolver.current = resolve;
      setRequest({ options, resolve });
    });
  }, []);

  const finish = useCallback((value: boolean) => {
    const resolve = resolver.current;
    resolver.current = null;
    setRequest(null);
    resolve?.(value);
  }, []);

  useEffect(() => {
    return () => {
      resolver.current?.(false);
      resolver.current = null;
    };
  }, []);

  useEffect(() => {
    if (!request) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        finish(false);
      }
    };
    window.addEventListener('keydown', onKey, true);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey, true);
    };
  }, [request, finish]);

  const value: ConfirmContextValue = { confirm };

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {request &&
        createPortal(
          <AnimatePresence>
            <motion.div
              className="overlay confirm-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              onClick={() => finish(false)}
            >
              <motion.div
                className="sheet confirm-sheet"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="confirm-title"
                aria-describedby="confirm-message"
                initial={{ opacity: 0, y: 14, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="sheet__head">
                  <div className="confirm-sheet__lead">
                    <span
                      className={`confirm-sheet__icon confirm-sheet__icon--${request.options.tone ?? 'primary'}`}
                    >
                      {request.options.tone === 'danger' ? (
                        <AlertTriangle className="ico" />
                      ) : (
                        <Save className="ico" />
                      )}
                    </span>
                    <div>
                      <div className="sheet__title" id="confirm-title">
                        {request.options.title}
                      </div>
                      <div className="sheet__sub">Konfirmasi tindakan ini sebelum melanjutkan.</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="ibtn"
                    onClick={() => finish(false)}
                    aria-label="Tutup"
                  >
                    <X className="ico" />
                  </button>
                </div>

                <div className="sheet__body">
                  <div className="confirm-sheet__message" id="confirm-message">
                    {request.options.message}
                  </div>
                  {request.options.detail && (
                    <div className="note">
                      <HelpCircle className="ico" />
                      <div>{request.options.detail}</div>
                    </div>
                  )}
                </div>

                <div className="sheet__foot">
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => finish(false)}
                    autoFocus
                  >
                    {request.options.cancelLabel ?? 'Batal'}
                  </button>
                  <button
                    type="button"
                    className={`btn ${
                      request.options.tone === 'danger' ? 'btn--danger' : 'btn--primary'
                    }`}
                    onClick={() => finish(true)}
                  >
                    {request.options.tone === 'danger' ? (
                      <Trash2 className="ico" />
                    ) : (
                      <Save className="ico" />
                    )}
                    {request.options.confirmLabel ?? 'Ya, lanjutkan'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </AnimatePresence>,
          document.body
        )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm harus dipakai di dalam ConfirmProvider');
  }
  return context;
}
