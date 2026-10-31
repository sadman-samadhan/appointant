'use client';

import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Modal } from '@/components/ui/Modal';

// "Are you sure?" questions in the site's own window, instead of the browser's pop-up.
//   const confirm = useConfirm();
//   if (!(await confirm({ title: 'Mark as no-show', message: '…', confirmLabel: 'Mark no-show' }))) return;

export interface ConfirmOptions {
  title: string;
  message: React.ReactNode;
  /** The button that goes ahead. */
  confirmLabel?: string;
  /** The button that backs out. */
  cancelLabel?: string;
  /** Red button, for something that removes or can't be undone. */
  danger?: boolean;
}

type Confirm = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<Confirm | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const confirm = useCallback<Confirm>((next) => {
    resolver.current?.(false);
    setOptions(next);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const answer = useCallback((ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setOptions(null);
  }, []);

  const close = useCallback(() => answer(false), [answer]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal isOpen={!!options} onClose={close} title={options?.title || ''} maxWidth="sm">
        {options && (
          <div className="space-y-4">
            <div className="text-sm text-[var(--foreground)]">{options.message}</div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
              <button type="button" onClick={close} className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--muted)] text-[var(--foreground)]">
                {options.cancelLabel || 'Go back'}
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => answer(true)}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white ${
                  options.danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-[var(--primary)] hover:opacity-90'
                }`}
              >
                {options.confirmLabel || 'Yes'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): Confirm {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error('useConfirm must be used inside ConfirmProvider');
  return confirm;
}
