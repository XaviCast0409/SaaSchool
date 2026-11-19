import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { getApiErrorMessage } from '@/lib/errors';
import { useCopyFeeSchedules } from '../../api/useFeeSchedules';

export interface CopyFeeScheduleModalProps {
  open: boolean;
  onClose: () => void;
  toYearId: string;
  years: { id: string; label: string }[];
}

export const CopyFeeScheduleModal: React.FC<CopyFeeScheduleModalProps> = ({
  open,
  onClose,
  toYearId,
  years,
}) => {
  const copy = useCopyFeeSchedules();
  const options = years.filter((y) => y.id !== toYearId);
  const [from, setFrom] = useState('');

  useEffect(() => {
    if (open) setFrom(options[0]?.id ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Copiar tarifario de otro año"
      description="Se copian los niveles y grados que aún no tienen tarifario en este año. Luego puedes ajustar los montos."
      size="sm"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            size="sm"
            disabled={!from}
            isLoading={copy.isPending}
            onClick={() =>
              copy.mutate(
                { fromAcademicYearId: from, toAcademicYearId: toYearId },
                {
                  onSuccess: (r) => {
                    toast.success(
                      r.copied ? `Se copiaron ${r.copied} tarifarios.` : 'No había tarifarios nuevos que copiar.',
                    );
                    onClose();
                  },
                  onError: (e) => toast.error(getApiErrorMessage(e, 'No se pudo copiar el tarifario.')),
                },
              )
            }
          >
            Copiar
          </Button>
        </>
      }
    >
      {options.length === 0 ? (
        <p className="text-xs text-muted-foreground">No hay otros años académicos registrados.</p>
      ) : (
        <select
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="w-full text-xs rounded-xl border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {options.map((y) => (
            <option key={y.id} value={y.id}>
              {y.label}
            </option>
          ))}
        </select>
      )}
    </Modal>
  );
};
