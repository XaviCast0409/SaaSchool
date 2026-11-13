import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCreateAdjustment } from '../api/useFinance';
import { apiError } from '../api/useCash';

type Kind = 'DISCOUNT' | 'CREDIT_NOTE' | 'LATE_FEE';

const HINTS: Record<Kind, string> = {
  DISCOUNT: 'Rebaja puntual (pronto pago, hermanos, apoyo). Para descuentos de todo el año usa una beca.',
  CREDIT_NOTE: 'Corrección formal del monto (p. ej. se cobró un concepto de más). Queda numerada.',
  LATE_FEE: 'Interés moratorio manual. Recuerda: la ley limita la tasa a la interbancaria del BCRP.',
};

/** Registrar un descuento, nota de crédito o mora a una cuota (con motivo, queda numerado). */
export const AdjustmentDialog: React.FC<{
  open: boolean;
  obligationId: string;
  originalAmount: number;
  currentDue: number;
  paid: number;
  onClose: () => void;
}> = ({ open, obligationId, originalAmount, currentDue, paid, onClose }) => {
  const create = useCreateAdjustment();
  const [type, setType] = useState<Kind>('DISCOUNT');
  const [mode, setMode] = useState<'amount' | 'percent'>('amount');
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');
  useEffect(() => {
    if (open) {
      setType('DISCOUNT');
      setMode('amount');
      setValue('');
      setReason('');
    }
  }, [open]);

  const num = Number(value);
  const amount = mode === 'percent' ? Math.round(originalAmount * num) / 100 : Math.round(num * 100) / 100;
  const sign = type === 'LATE_FEE' ? 1 : -1;
  const newDue = Math.round((currentDue + sign * amount) * 100) / 100;
  const belowPaid = sign < 0 && newDue < paid;
  const valid = amount > 0 && newDue >= 0 && !belowPaid && reason.trim().length >= 5 && (mode === 'amount' || num <= 100);

  const submit = () =>
    create.mutate(
      { obligationId, type, amount, reason: reason.trim() },
      {
        onSuccess: (a) => {
          toast.success(`Ajuste ${a.number} registrado. La cuota queda en S/ ${newDue.toFixed(2)}.`);
          onClose();
        },
        onError: (e) => toast.error(apiError(e, 'No se pudo registrar el ajuste.')),
      },
    );

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="Agregar ajuste a la cuota"
      description={`Monto original S/ ${originalAmount.toFixed(2)} · vigente S/ ${currentDue.toFixed(2)} · pagado S/ ${paid.toFixed(2)}`}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button size="sm" disabled={!valid} isLoading={create.isPending} onClick={submit}>
            Registrar ajuste
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-1 rounded-lg border border-border p-1 text-xs">
          {(['DISCOUNT', 'CREDIT_NOTE', 'LATE_FEE'] as Kind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                setType(k);
                if (k !== 'DISCOUNT') setMode('amount');
              }}
              className={`rounded-md px-2 py-1.5 font-semibold ${type === k ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
            >
              {k === 'DISCOUNT' ? 'Descuento' : k === 'CREDIT_NOTE' ? 'Nota de crédito' : 'Mora'}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">{HINTS[type]}</p>

        {type === 'DISCOUNT' && (
          <div className="flex gap-3 text-xs">
            <label className="flex items-center gap-1.5">
              <input type="radio" checked={mode === 'amount'} onChange={() => setMode('amount')} /> Monto en soles
            </label>
            <label className="flex items-center gap-1.5">
              <input type="radio" checked={mode === 'percent'} onChange={() => setMode('percent')} /> Porcentaje del monto original
            </label>
          </div>
        )}
        <label className="block space-y-1 text-xs font-semibold">
          {mode === 'percent' ? 'Porcentaje (%)' : 'Monto (S/)'}
          <Input type="number" step="0.01" min="0" max={mode === 'percent' ? 100 : undefined} value={value} onChange={(e) => setValue(e.target.value)} autoFocus />
        </label>
        {amount > 0 && (
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-2.5 text-sm">
            <span className="text-muted-foreground">{sign < 0 ? 'Rebaja' : 'Recargo'} de S/ {amount.toFixed(2)} → cuota queda en</span>
            <span className={`font-bold ${belowPaid || newDue < 0 ? 'text-destructive' : ''}`}>S/ {newDue.toFixed(2)}</span>
          </div>
        )}
        {belowPaid && <p className="text-xs text-destructive">No puede quedar por debajo de lo ya pagado. Anula primero el cobro o registra una devolución.</p>}
        <label className="block space-y-1 text-xs font-semibold">
          Motivo (obligatorio)
          <textarea
            rows={2}
            maxLength={300}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ej: Descuento por pronto pago aprobado por Dirección"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-normal"
          />
        </label>
      </div>
    </Modal>
  );
};
