import React from 'react';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AttendanceAlert } from '../../types';

interface CiteFamilyModalProps {
  alert: AttendanceAlert | null;
  citationDate: string;
  note: string;
  isPending: boolean;
  onCitationDateChange: (date: string) => void;
  onNoteChange: (note: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export const CiteFamilyModal: React.FC<CiteFamilyModalProps> = ({
  alert,
  citationDate,
  note,
  isPending,
  onCitationDateChange,
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
          <h3 className="text-base font-black text-foreground">Citar a la Familia</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground">
          Se creará una citación oficial en la agenda del estudiante y se notificará a los apoderados por la app y
          notificación push.
        </p>

        <div>
          <label className="text-xs font-bold text-foreground block mb-1">
            Fecha y hora de la citación <span className="text-destructive">*</span>
          </label>
          <input
            type="datetime-local"
            value={citationDate}
            onChange={(e) => onCitationDateChange(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-foreground block mb-1">
            Indicación o nota adicional (opcional)
          </label>
          <textarea
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder="Ej. Traer justificativos médicos o compromisos de puntualidad..."
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
            disabled={isPending || !citationDate}
            onClick={onConfirm}
            className="rounded-xl text-xs font-bold gap-1.5"
          >
            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Emitir citación oficial</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
