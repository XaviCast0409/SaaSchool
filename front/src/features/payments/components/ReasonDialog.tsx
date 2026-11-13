import React, { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';

interface ReasonDialogProps {
  open: boolean;
  title: string;
  description?: string;
  /** Texto que explica qué pasará (p. ej. "El recibo quedará como ANULADO…"). */
  warning?: string;
  confirmLabel: string;
  isPending?: boolean;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}

const MIN = 5;

/** Pide un motivo obligatorio antes de anular o reabrir. Nada se borra: queda constancia. */
export const ReasonDialog: React.FC<ReasonDialogProps> = ({
  open,
  title,
  description,
  warning,
  confirmLabel,
  isPending,
  onConfirm,
  onClose,
}) => {
  const [reason, setReason] = useState('');
  useEffect(() => {
    if (open) setReason('');
  }, [open]);
  const valid = reason.trim().length >= MIN;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="destructive" size="sm" disabled={!valid} isLoading={isPending} onClick={() => onConfirm(reason.trim())}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {warning && (
          <p className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-800 dark:text-amber-300">
            {warning}
          </p>
        )}
        <label className="block text-xs font-semibold text-foreground" htmlFor="reason-input">
          Motivo (obligatorio)
        </label>
        <textarea
          id="reason-input"
          autoFocus
          rows={3}
          maxLength={300}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ej: Se registró con el monto equivocado"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <p className="text-[11px] text-muted-foreground">
          Mínimo {MIN} caracteres. Quedará registrado con tu nombre, la fecha y la hora.
        </p>
      </div>
    </Modal>
  );
};
