import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatMoney } from '@/lib/format';
import { getApiErrorMessage } from '@/lib/errors';
import { useCloseCash } from '../../api/useCash';
import { DifferenceText } from './DifferenceText';

export const CloseCashModal: React.FC<{
  open: boolean;
  sessionId: string;
  expectedCash: number;
  onClose: () => void;
}> = ({ open, sessionId, expectedCash, onClose }) => {
  const close = useCloseCash();
  const [counted, setCounted] = useState('');
  const [note, setNote] = useState('');
  // Arqueo ciego: primero se cuenta, y recién después se muestra cuánto se esperaba.
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    if (open) {
      setCounted('');
      setNote('');
      setRevealed(false);
    }
  }, [open]);
  const hasValue = counted.trim() !== '' && Number(counted) >= 0;
  const diff = hasValue && revealed ? Math.round((Number(counted) - expectedCash) * 100) / 100 : null;

  const submit = () =>
    close.mutate(
      { id: sessionId, countedCash: Number(counted), closingNote: note.trim() || undefined },
      {
        onSuccess: (s) => {
          const d = Number(s.difference ?? 0);
          toast.success(
            d === 0
              ? 'Caja cerrada y cuadrada.'
              : `Caja cerrada con ${d > 0 ? 'sobrante' : 'faltante'} de ${formatMoney(Math.abs(d))}. Se avisó a tesorería.`,
          );
          onClose();
        },
        onError: (e) => toast.error(getApiErrorMessage(e, 'No se pudo cerrar la caja.')),
      },
    );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cerrar caja (arqueo)"
      description="Cuenta el efectivo que tienes físicamente, incluido el fondo inicial."
      size="sm"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          {revealed ? (
            <Button
              size="sm"
              disabled={!hasValue || (diff !== 0 && note.trim().length < 5)}
              isLoading={close.isPending}
              onClick={submit}
            >
              Cerrar caja
            </Button>
          ) : (
            <Button size="sm" disabled={!hasValue} onClick={() => setRevealed(true)}>
              Registrar conteo
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-3">
        <label className="block space-y-1 text-xs font-semibold">
          Efectivo contado (S/)
          <Input
            type="number"
            step="0.01"
            min="0"
            autoFocus
            disabled={revealed}
            value={counted}
            onChange={(e) => setCounted(e.target.value)}
          />
        </label>
        {!revealed ? (
          <p className="text-xs text-muted-foreground">
            Cuenta billetes y monedas antes de ver el monto esperado: así el arqueo refleja lo que realmente hay en
            caja.
          </p>
        ) : (
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3 text-sm">
            <span className="text-muted-foreground">Efectivo esperado</span>
            <span className="font-bold">{formatMoney(expectedCash)}</span>
          </div>
        )}
        {diff !== null && (
          <div className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
            <span className="text-muted-foreground">Diferencia</span>
            <DifferenceText value={diff} />
          </div>
        )}
        {revealed && (
          <label className="block space-y-1 text-xs font-semibold">
            Observación {diff !== null && diff !== 0 ? '(obligatoria si hay diferencia)' : '(opcional)'}
            <textarea
              rows={2}
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-normal"
              placeholder="Ej: Faltan S/ 2 de vuelto que se dio a un apoderado"
            />
          </label>
        )}
        <p className="text-xs text-muted-foreground">
          Después de cerrar ya no podrás cobrar en esta caja ni anular sus movimientos. Si hubo un error, el tesorero
          puede reabrirla.
        </p>
      </div>
    </Modal>
  );
};
