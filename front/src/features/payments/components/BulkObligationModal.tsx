import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Layers, X, Save, School, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { bulkCreateObligationsSchema, type BulkCreateObligationsFormData } from '../schemas/payment.schema';
import { useBulkCreateObligations } from '../api/usePayments';
import { useClassrooms } from '@/features/classrooms/api/useClassrooms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface BulkObligationModalProps {
  onClose: () => void;
}

const PRESET_PENSIONS = [
  { label: 'Pensión Marzo 2026', title: 'Pensión Marzo 2026', concept: 'PENSION', dueDate: '2026-03-31' },
  { label: 'Pensión Abril 2026', title: 'Pensión Abril 2026', concept: 'PENSION', dueDate: '2026-04-30' },
  { label: 'Pensión Mayo 2026', title: 'Pensión Mayo 2026', concept: 'PENSION', dueDate: '2026-05-31' },
  { label: 'Pensión Junio 2026', title: 'Pensión Junio 2026', concept: 'PENSION', dueDate: '2026-06-30' },
  { label: 'Pensión Julio 2026', title: 'Pensión Julio 2026', concept: 'PENSION', dueDate: '2026-07-31' },
  { label: 'Pensión Agosto 2026', title: 'Pensión Agosto 2026', concept: 'PENSION', dueDate: '2026-08-31' },
  { label: 'Pensión Septiembre 2026', title: 'Pensión Septiembre 2026', concept: 'PENSION', dueDate: '2026-09-30' },
  { label: 'Pensión Octubre 2026', title: 'Pensión Octubre 2026', concept: 'PENSION', dueDate: '2026-10-31' },
  { label: 'Pensión Noviembre 2026', title: 'Pensión Noviembre 2026', concept: 'PENSION', dueDate: '2026-11-30' },
  { label: 'Pensión Diciembre 2026', title: 'Pensión Diciembre 2026', concept: 'PENSION', dueDate: '2026-12-31' },
  { label: 'Matrícula Escolar 2026', title: 'Matrícula Escolar 2026', concept: 'MATRICULA', dueDate: '2026-03-01' },
  { label: 'Cuota de Ingreso 2026', title: 'Cuota de Ingreso 2026', concept: 'CUOTA_INGRESO', dueDate: '2026-03-01' },
  { label: 'Pensión Enero 2026', title: 'Pensión Enero 2026', concept: 'PENSION', dueDate: '2026-01-31' },
  { label: 'Pensión Febrero 2026', title: 'Pensión Febrero 2026', concept: 'PENSION', dueDate: '2026-02-28' },
  { label: '✏️ Otro concepto personalizado...', title: 'CUSTOM', concept: 'CUSTOM', dueDate: '' },
];

export const BulkObligationModal: React.FC<BulkObligationModalProps> = ({ onClose }) => {
  const { mutate: bulkCreate, isPending, error } = useBulkCreateObligations();
  const { data: classrooms = [] } = useClassrooms();
  const [selectedPreset, setSelectedPreset] = useState<string>('Pensión Marzo 2026');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<BulkCreateObligationsFormData>({
    resolver: zodResolver(bulkCreateObligationsSchema),
    defaultValues: {
      title: 'Pensión Marzo 2026',
      concept: 'PENSION',
      amountDue: 350.0,
      dueDate: '2026-03-31',
    },
  });

  const handlePresetChange = (presetTitle: string) => {
    setSelectedPreset(presetTitle);
    const preset = PRESET_PENSIONS.find((p) => p.title === presetTitle);
    if (preset && preset.title !== 'CUSTOM') {
      setValue('title', preset.title, { shouldValidate: true });
      setValue('concept', preset.concept, { shouldValidate: true });
      setValue('dueDate', preset.dueDate, { shouldValidate: true });
    } else if (presetTitle === 'CUSTOM') {
      setValue('title', '', { shouldValidate: true });
      setValue('concept', 'PENSION', { shouldValidate: true });
    }
  };

  const onSubmit = (data: BulkCreateObligationsFormData) => {
    const payload = {
      ...data,
      classroomId: data.classroomId?.trim() === '' ? undefined : data.classroomId,
    };
    bulkCreate(payload, {
      onSuccess: (res) => {
        const count = res.count || 0;
        const skipped = res.skippedCount || 0;
        toast.success(
          `✨ Cronograma generado: Se emitieron ${count} pensiones correctamente${
            skipped > 0 ? ` (${skipped} omitidas por ya estar al día)` : ''
          }.`
        );
        onClose();
      },
      onError: (err: any) => {
        toast.error(err?.response?.data?.message || 'Error al generar el cronograma masivo.');
      },
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
                Selecciona la pensión del mes correspondiente para emitirla masivamente.
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

          {/* Selector de Mes / Pensión Predeterminada */}
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-foreground flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              <span>Seleccionar Mes / Pensión a Cobrar</span>
            </label>
            <select
              value={selectedPreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer shadow-sm"
            >
              {PRESET_PENSIONS.map((p) => (
                <option key={p.title} value={p.title}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Alcance / Sección */}
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-foreground flex items-center gap-1">
              <School className="w-3.5 h-3.5 text-primary" />
              <span>Alcance del Cobro</span>
            </label>
            <select
              {...register('classroomId')}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
            >
              <option value="">✨ TODO EL COLEGIO (Todos los matriculados)</option>
              {classrooms.map((c) => (
                <option key={c.id} value={c.id}>
                  Sección: {c.grade}° {c.section} ({c.educationLevel})
                </option>
              ))}
            </select>
          </div>

          {/* Si se selecciona CUSTOM o desea personalizar el título */}
          {selectedPreset === 'CUSTOM' ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-foreground">
                  Título del Cobro Personalizado
                </label>
                <Input placeholder="Ej: Talleres de Verano" {...register('title')} className="h-9 text-xs" />
                {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-foreground">
                  Concepto
                </label>
                <Input placeholder="Ej: TALLER" {...register('concept')} className="h-9 text-xs" />
                {errors.concept && <p className="text-xs text-destructive">{errors.concept.message}</p>}
              </div>
            </div>
          ) : (
            <input type="hidden" {...register('title')} />
          )}

          {/* Monto y Fecha Vencimiento */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-foreground">
                Monto a Cobrar (S/)
              </label>
              <Input type="number" step="0.01" {...register('amountDue')} className="h-9 text-sm font-bold text-primary" />
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
