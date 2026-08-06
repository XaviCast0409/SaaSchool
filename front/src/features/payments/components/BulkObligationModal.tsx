import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Layers, X, Save, School } from 'lucide-react';
import { bulkCreateObligationsSchema, type BulkCreateObligationsFormData } from '../schemas/payment.schema';
import { useBulkCreateObligations } from '../api/usePayments';
import { useClassrooms } from '@/features/classrooms/api/useClassrooms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface BulkObligationModalProps {
  onClose: () => void;
}

export const BulkObligationModal: React.FC<BulkObligationModalProps> = ({ onClose }) => {
  const { mutate: bulkCreate, isPending, error } = useBulkCreateObligations();
  const { data: classrooms = [] } = useClassrooms();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BulkCreateObligationsFormData>({
    resolver: zodResolver(bulkCreateObligationsSchema),
    defaultValues: {
      title: 'Pensión Escolar',
      concept: 'PENSION',
      amountDue: 350.0,
      dueDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
        .toISOString()
        .split('T')[0],
    },
  });

  const onSubmit = (data: BulkCreateObligationsFormData) => {
    bulkCreate(data, {
      onSuccess: () => onClose(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4 bg-card shrink-0">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            <div>
              <h2 className="font-bold text-base text-foreground leading-none">
                Generar Cronograma Masivo de Pagos
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Genera cobros de pensiones para todos los alumnos matriculados.
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

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-xs font-medium border border-destructive/20">
              {(error as { response?: { data?: { message?: string } } }).response?.data?.message ||
                'Error al generar el cronograma masivo.'}
            </div>
          )}

          {/* Alcance / Sección */}
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-foreground flex items-center gap-1">
              <School className="w-3.5 h-3.5 text-primary" />
              <span>Alcance del Cobro</span>
            </label>
            <select
              {...register('classroomId')}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
            >
              <option value="">✨ TODO EL COLEGIO (Todos los matriculados)</option>
              {classrooms.map((c) => (
                <option key={c.id} value={c.id}>
                  Sección: {c.grade}° {c.section} ({c.educationLevel})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-muted-foreground">
              Puedes aplicar la pensión a todo el colegio o solo a un aula específica.
            </p>
          </div>

          {/* Título y Concepto */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-foreground">
                Título del Cobro
              </label>
              <Input placeholder="Ej: Pensión Marzo 2026" {...register('title')} className="h-9 text-xs" />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-foreground">
                Concepto
              </label>
              <Input placeholder="Ej: PENSION, MATRICULA" {...register('concept')} className="h-9 text-xs" />
              {errors.concept && <p className="text-xs text-destructive">{errors.concept.message}</p>}
            </div>
          </div>

          {/* Monto y Fecha Vencimiento */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-foreground">
                Monto a Cobrar (S/)
              </label>
              <Input type="number" step="0.01" {...register('amountDue')} className="h-9 text-sm font-semibold" />
              {errors.amountDue && <p className="text-xs text-destructive">{errors.amountDue.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-foreground">
                Fecha Vencimiento
              </label>
              <Input type="date" {...register('dueDate')} className="h-9 text-xs" />
              {errors.dueDate && <p className="text-xs text-destructive">{errors.dueDate.message}</p>}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" isLoading={isPending} className="gap-2">
              <Save className="w-4 h-4" />
              <span>Generar Cronograma</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
