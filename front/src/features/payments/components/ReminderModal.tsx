import React, { useState } from 'react';
import { Send, X, Mail, CheckCircle2 } from 'lucide-react';
import { useSendReminder } from '../api/usePayments';
import { Button } from '@/components/ui/button';
import { PaymentObligation } from '../types';

interface ReminderModalProps {
  obligation: PaymentObligation;
  onClose: () => void;
}

export const ReminderModal: React.FC<ReminderModalProps> = ({ obligation, onClose }) => {
  const [isSuccess, setIsSuccess] = useState(false);

  const { mutate: sendReminder, isPending, error } = useSendReminder();

  const student = obligation.enrollment?.student;
  const studentName = student
    ? `${student.firstNames} ${student.lastNamePaternal}`
    : 'Estudiante';

  const handleSend = () => {
    sendReminder(
      { obligationId: obligation.id, channel: 'EMAIL' },
      {
        onSuccess: () => {
          setIsSuccess(true);
          setTimeout(() => onClose(), 2000);
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4 bg-card shrink-0">
          <div className="flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-base text-foreground leading-none">
              Enviar Recordatorio de Pago
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {isSuccess ? (
            <div className="p-6 text-center space-y-2">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h3 className="font-bold text-base text-foreground">¡Recordatorio Enviado!</h3>
              <p className="text-xs text-muted-foreground">
                Se ha notificado exitosamente al correo electrónico del apoderado de {studentName}.
              </p>
            </div>
          ) : (
            <>
              {error && (
                <div className="p-3 rounded-md bg-destructive/10 text-destructive text-xs font-medium border border-destructive/20">
                  {(error as { response?: { data?: { message?: string } } }).response?.data?.message ||
                    'Error al enviar el recordatorio.'}
                </div>
              )}

              {/* Obligation Summary */}
              <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-semibold">Alumno:</span>
                  <span className="font-bold text-foreground">{studentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-semibold">Deuda / Concepto:</span>
                  <span className="font-semibold text-foreground">{obligation.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-semibold">Monto Pendiente:</span>
                  <span className="font-bold text-destructive">S/ {obligation.amountDue.toFixed(2)}</span>
                </div>
              </div>

              {/* Canal de Envío */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-foreground">
                  Canal de Notificación
                </label>
                <div className="flex items-start gap-2.5 p-3 rounded-lg border border-border bg-muted/30 text-xs">
                  <Mail className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-semibold text-foreground">Correo Electrónico (Email)</p>
                    <p className="text-muted-foreground text-[11px] leading-relaxed">
                      Se enviará el recordatorio con los detalles de la deuda y fecha límite directamente al correo registrado del apoderado financiero.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!isSuccess && (
          <div className="p-4 border-t border-border bg-card flex items-center justify-between shrink-0">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button size="sm" isLoading={isPending} onClick={handleSend} className="gap-2">
              <Send className="w-4 h-4" />
              <span>Enviar por Correo</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
