import React, { useState } from 'react';
import { X, MessageSquare, Save, Loader2 } from 'lucide-react';
import { useUpdateAttendance } from '../api/useAttendance';
import { AttendanceRecord, AttendanceStatus } from '../types';
import { AttendanceStatusBadge } from './AttendanceStatusBadge';
import { Button } from '@/components/ui/button';

interface EditNotesModalProps {
  record: AttendanceRecord;
  onClose: () => void;
}

/**
 * Fix #4: Modal para agregar o editar la nota/justificación de un registro de asistencia.
 * Se abre al hacer clic en la columna "Observaciones" de la tabla del Control Diario.
 */
export const EditNotesModal: React.FC<EditNotesModalProps> = ({ record, onClose }) => {
  const [notes, setNotes] = useState(record.notes ?? '');
  const { mutate: updateAttendance, isPending } = useUpdateAttendance();

  const student = record.enrollment?.student;
  const studentName = student
    ? `${student.lastNamePaternal} ${student.lastNameMaternal}, ${student.firstNames}`
    : 'Estudiante';

  const handleSave = () => {
    updateAttendance(
      {
        id: record.id,
        status: record.status as AttendanceStatus,
        notes: notes.trim() || undefined,
      },
      { onSuccess: onClose }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            <div>
              <h2 className="font-bold text-sm text-foreground leading-none">
                Observación / Justificación
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[260px]">
                {studentName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Estado actual */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-semibold">Estado:</span>
            <AttendanceStatusBadge status={record.status} />
          </div>

          {/* Campo de texto */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground block">
              Justificación / Observación
            </label>
            <textarea
              autoFocus
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Certificado médico presentado, Permiso de Dirección, Viaje familiar..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
            <p className="text-[10px] text-muted-foreground">
              Esta observación quedará guardada en el registro y visible para el Director.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border p-4">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isPending}
            className="gap-2"
          >
            {isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            Guardar Observación
          </Button>
        </div>
      </div>
    </div>
  );
};
