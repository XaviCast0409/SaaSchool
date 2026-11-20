import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import type { AttendanceJustification } from '../../types';

interface ReviewJustificationModalProps {
  item: AttendanceJustification | null;
  note: string;
  isPending: boolean;
  onNoteChange: (note: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export const ReviewJustificationModal: React.FC<ReviewJustificationModalProps> = ({
  item,
  note,
  isPending,
  onNoteChange,
  onClose,
  onConfirm,
}) => {
  if (!item) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl p-5 space-y-4">
        <div>
          <h3 className="text-base font-black text-foreground">Rechazar Justificación</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Indica opcionalmente el motivo del rechazo para informar a la familia.
          </p>
        </div>

        <div>
          <label className="text-xs font-bold text-foreground block mb-1">Motivo / Observación</label>
          <textarea
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder="Ej. El certificado adjunto no corresponde a las fechas solicitadas..."
            rows={3}
            className="w-full rounded-xl border border-border bg-background p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isPending}
            className="rounded-xl text-xs font-bold"
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={isPending}
            onClick={onConfirm}
            className="rounded-xl text-xs font-bold gap-1.5"
          >
            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Confirmar rechazo</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
