import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ConfirmDialog, type ConfirmDialogProps } from './ConfirmDialog';

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmDialogProps['variant'];
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/** El proveedor montado; permite confirmar desde cualquier función, como `toast` */
let activeConfirm: ConfirmFn | null = null;

/**
 * Confirmación con el diálogo de la app en lugar de `window.confirm`:
 *
 *   if (!(await confirmDialog({ title: '¿Eliminar este evento?', variant: 'danger' }))) return;
 */
export const confirmDialog: ConfirmFn = (options) =>
  activeConfirm
    ? activeConfirm(options)
    : Promise.resolve(window.confirm([options.title, options.description].filter(Boolean).join('\n\n')));

/** Monta el diálogo de confirmación una sola vez para toda la app. */
export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((next) => {
    // Si quedó una confirmación abierta, se da por cancelada
    resolver.current?.(false);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      setOptions(next);
    });
  }, []);

  const settle = useCallback((value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setOptions(null);
  }, []);

  useEffect(() => {
    activeConfirm = confirm;
    return () => {
      if (activeConfirm === confirm) activeConfirm = null;
    };
  }, [confirm]);

  const handleClose = useCallback(() => settle(false), [settle]);
  const handleConfirm = useCallback(() => settle(true), [settle]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog
        isOpen={options !== null}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title={options?.title ?? ''}
        description={options?.description ?? ''}
        confirmText={options?.confirmText}
        cancelText={options?.cancelText}
        variant={options?.variant ?? 'warning'}
      />
    </ConfirmContext.Provider>
  );
};

export const useConfirm = (): ConfirmFn => {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm debe usarse dentro de <ConfirmProvider>');
  return ctx;
};
