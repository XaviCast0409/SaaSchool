import React from 'react';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AttendanceAlert } from '../../types';

interface AttendAlertModalProps {
  alert: AttendanceAlert | null;
  note: string;
  isPending: boolean;
  onNoteChange: (note: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export const AttendAlertModal: React.FC<AttendAlertModalProps> = ({
  alert,
  note,
  isPending,
  onNoteChange,
  onClose,
  onConfirm,
}) => {
  if (!alert) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-base font-black text-foreground">Atender Alerta de Asistencia</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground">
          Registra una breve nota de seguimiento (llamada al apoderado, conversación con el estudiante, etc.).
        </p>

        <div>
          <label className="text-xs font-bold text-foreground block mb-1">
            Nota de seguimiento <span className="text-destructive">*</span>
          </label>
          <textarea
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder="Ej. Se llamó a la madre de familia; indica que el menor estuvo con descanso médico..."
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
            disabled={isPending || note.trim().length < 3}
            onClick={onConfirm}
            className="rounded-xl text-xs font-bold gap-1.5"
          >
            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Guardar atención</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
