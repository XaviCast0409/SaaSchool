import React, { useState, useEffect } from 'react';
import { X, Save, Edit3, Tag, Calendar, DollarSign, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUpdateObligation } from '../api/usePayments';
import { apiError } from '../api/useCash';
import type { PaymentObligation } from '../types';

interface EditObligationModalProps {
  isOpen: boolean;
  onClose: () => void;
  obligation: PaymentObligation | null;
}

export const EditObligationModal: React.FC<EditObligationModalProps> = ({
  isOpen,
  onClose,
  obligation,
}) => {
  const updateMutation = useUpdateObligation();

  const [amountDue, setAmountDue] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (obligation) {
      setAmountDue(String(obligation.amountDue));
      const formattedDate = obligation.dueDate
        ? new Date(obligation.dueDate).toISOString().split('T')[0]
        : '';
      setDueDate(formattedDate);
      setTitle(obligation.title);
      setNotes(obligation.notes || '');
    }
  }, [obligation]);

  if (!isOpen || !obligation) return null;

  const studentName = obligation.enrollment?.student
    ? `${obligation.enrollment.student.lastNamePaternal} ${obligation.enrollment.student.lastNameMaternal || ''}, ${obligation.enrollment.student.firstNames}`.trim()
    : 'Estudiante';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const numericAmount = parseFloat(amountDue);
    if (isNaN(numericAmount) || numericAmount < 0) {
      toast.error('El monto de la cuota debe ser un número válido mayor o igual a 0.');
      return;
    }

    if (!dueDate) {
      toast.error('Por favor especifica una fecha de vencimiento.');
      return;
    }

    const amountChanged = numericAmount !== Number(obligation.amountDue);
    if (amountChanged && obligation.transactions.length > 0) {
      toast.error('Esta cuota ya tiene cobros. Para cambiar el monto, primero anula los cobros (botón Cobros).');
      return;
    }
    if (amountChanged && notes.trim().length < 5) {
      toast.error('Escribe el motivo del cambio de monto (mínimo 5 caracteres).');
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: obligation.id,
        data: {
          amountDue: numericAmount,
          dueDate: new Date(dueDate).toISOString(),
          title: title.trim() || undefined,
          // El motivo queda en la auditoría junto con el monto anterior y el nuevo
          reason: notes.trim() || null,
        },
      });

      toast.success('Cuota de pago actualizada correctamente.');
      onClose();
    } catch (err) {
      toast.error(apiError(err, 'Error al actualizar la obligación de pago.'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-muted/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Editar Cuota / Descuento</h2>
              <p className="text-xs text-muted-foreground truncate max-w-xs">{studentName}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-xl h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Concepto / Título */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-primary" />
              <span>Concepto de Cobro</span>
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-xs h-9 rounded-xl"
              required
            />
          </div>

          {/* Monto y Fecha */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Monto a Cobrar (S/)</span>
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={amountDue}
                onChange={(e) => setAmountDue(e.target.value)}
                className="text-xs h-9 font-mono font-bold rounded-xl"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                <span>Fecha de Vencimiento</span>
              </label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="text-xs h-9 rounded-xl"
                required
              />
            </div>
          </div>

          <p className="rounded-lg border border-border bg-muted/30 p-2.5 text-[11px] text-muted-foreground">
            Aquí solo se corrige el monto base de una cuota sin cobros ni ajustes. Para descuentos, notas de crédito o moras usa
            <strong> Cobros → Agregar ajuste</strong>; para becas de todo el año, <strong>Becas y moras</strong>. Así queda constancia numerada.
          </p>

          {/* Motivo / Notas */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Motivo del cambio (obligatorio si cambias el monto)</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Aprobado por Dirección según solicitud de beca socioeconómica..."
              className="w-full p-2.5 text-xs rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Botones de acción */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={updateMutation.isPending}
              className="text-xs rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={updateMutation.isPending}
              className="gap-2 text-xs font-bold rounded-xl shadow-xs"
            >
              {updateMutation.isPending ? (
                <span className="animate-spin w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>Guardar Cuota</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

