import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AlertTriangle, Copy, Check, Printer, X, KeyRound } from 'lucide-react';
import { Button } from './button';
import { toast } from 'sonner';

export interface TemporaryCredential {
  name: string;
  login: string;
  password: string;
}

export interface Props {
  open: boolean;
  onClose?: () => void;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description?: string;
  credentials: TemporaryCredential[];
}

export const TemporaryCredentialsDialog: React.FC<Props> = ({
  open,
  onClose,
  onOpenChange,
  title,
  description,
  credentials,
}) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleClose = () => {
    onClose?.();
    onOpenChange?.(false);
  };

  const handleCopy = (password: string, index: number) => {
    navigator.clipboard.writeText(password);
    setCopiedIndex(index);
    toast.success('Contraseña copiada al portapapeles');
    setTimeout(() => {
      setCopiedIndex(null);
    }, 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm animate-in fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-card w-full rounded-2xl shadow-2xl border border-border p-6 space-y-5 text-foreground print-area">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 shrink-0">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <Dialog.Title className="text-lg font-bold tracking-tight">
                    {title}
                  </Dialog.Title>
                  <Dialog.Description className="text-xs text-muted-foreground mt-0.5">
                    {description || 'Credenciales temporales de acceso al sistema'}
                  </Dialog.Description>
                </div>
              </div>
              <Dialog.Close asChild>
                <button
                  onClick={handleClose}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors no-print"
                  aria-label="Cerrar"
                >
                  <X className="w-4 h-4" />
                </button>
              </Dialog.Close>
            </div>

            {/* Aviso Ámbar */}
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3.5 flex items-start gap-3 text-amber-800 dark:text-amber-200 text-xs leading-relaxed">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <span>
                Estas contraseñas solo se muestran una vez. Entrégalas de forma personal; el sistema pedirá cambiarlas en el primer ingreso.
              </span>
            </div>

            {/* Tabla de Credenciales */}
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto max-h-72">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/60 text-muted-foreground font-semibold border-b border-border">
                    <tr>
                      <th className="py-2.5 px-3">Nombre</th>
                      <th className="py-2.5 px-3">Usuario</th>
                      <th className="py-2.5 px-3">Contraseña temporal</th>
                      <th className="py-2.5 px-3 text-right no-print">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {credentials.map((cred, idx) => (
                      <tr key={idx} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-3 font-medium text-foreground">
                          {cred.name}
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground">
                          {cred.login}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-foreground">
                          {cred.password}
                        </td>
                        <td className="py-2.5 px-3 text-right no-print">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs gap-1"
                            onClick={() => handleCopy(cred.password, idx)}
                          >
                            {copiedIndex === idx ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                                <span className="text-emerald-500">Copiado</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copiar</span>
                              </>
                            )}
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {credentials.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-muted-foreground">
                          No se generaron credenciales nuevas.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Botones */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border no-print">
              <Button
                type="button"
                variant="outline"
                className="gap-1.5 h-9 text-xs"
                onClick={handlePrint}
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir</span>
              </Button>
              <Button
                type="button"
                className="h-9 text-xs font-semibold"
                onClick={onClose}
              >
                Cerrar
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
