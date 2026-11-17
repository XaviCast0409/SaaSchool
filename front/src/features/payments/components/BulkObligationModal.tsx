import React, { useState } from 'react';
import { formatEducationLevel } from '@/lib/utils';
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
    watch,
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

  const byLevel = watch('byLevel');
  const scope = watch('classroomId') || '';

  const onSubmit = (data: BulkCreateObligationsFormData) => {
    const scopeValue = data.classroomId?.trim() || '';
    const amountsByLevel = data.byLevel
      ? { INITIAL: data.amountInitial ?? null, PRIMARY: data.amountPrimary ?? null, SECONDARY: data.amountSecondary ?? null }
      : null;
    if (data.byLevel ? !Object.values(amountsByLevel!).some((v) => v) : !data.amountDue) {
      toast.error(data.byLevel ? 'Ingresa el monto de al menos un nivel.' : 'Ingresa el monto a cobrar.');
      return;
    }
    const payload = {
      title: data.title,
      concept: data.concept,
      dueDate: data.dueDate,
      amountDue: data.byLevel ? null : data.amountDue,
      amountsByLevel,
      educationLevel: scopeValue.startsWith('level:') ? scopeValue.slice(6) : undefined,
      classroomId: scopeValue && !scopeValue.startsWith('level:') ? scopeValue : undefined,
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
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
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
            <label htmlFor="bulkobligationmodal-field-1" className="text-xs font-semibold uppercase tracking-wide text-foreground flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              <span>Seleccionar Mes / Pensión a Cobrar</span>
            </label>
            <select id="bulkobligationmodal-field-1"
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
            <label htmlFor="bulkobligationmodal-classroomId" className="text-xs font-semibold uppercase tracking-wide text-foreground flex items-center gap-1">
              <School className="w-3.5 h-3.5 text-primary" />
              <span>Alcance del Cobro</span>
            </label>
            <select id="bulkobligationmodal-classroomId"
              {...register('classroomId')}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
            >
              <option value="">✨ TODO EL COLEGIO (Todos los matriculados)</option>
              <option value="level:INITIAL">Todo Inicial</option>
              <option value="level:PRIMARY">Toda Primaria</option>
              <option value="level:SECONDARY">Toda Secundaria</option>
              {classrooms.map((c) => (
                <option key={c.id} value={c.id}>
                  Sección: {c.grade}° {c.section} ({formatEducationLevel(c.educationLevel)})
                </option>
              ))}
            </select>
          </div>

          {/* Si se selecciona CUSTOM o desea personalizar el título */}
          {selectedPreset === 'CUSTOM' ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="bulkobligationmodal-title" className="text-xs font-semibold uppercase tracking-wide text-foreground">
                  Título del Cobro Personalizado
                </label>
                <Input id="bulkobligationmodal-title" placeholder="Ej: Talleres de Verano" {...register('title')} className="h-9 text-xs" />
                {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
              </div>

              <div className="space-y-1">
                <label htmlFor="bulkobligationmodal-concept" className="text-xs font-semibold uppercase tracking-wide text-foreground">
                  Concepto
                </label>
                <Input id="bulkobligationmodal-concept" placeholder="Ej: TALLER" {...register('concept')} className="h-9 text-xs" />
                {errors.concept && <p className="text-xs text-destructive">{errors.concept.message}</p>}
              </div>
            </div>
          ) : (
            <input type="hidden" {...register('title')} />
          )}

          {/* Monto distinto por nivel (solo cuando el alcance es todo el colegio) */}
          {!scope && (
            <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer">
              <input type="checkbox" {...register('byLevel')} className="w-4 h-4 rounded" />
              Monto distinto por nivel (Inicial, Primaria, Secundaria)
            </label>
          )}
          {!scope && byLevel && (
            <div className="grid grid-cols-3 gap-2 rounded-lg border border-border bg-muted/20 p-3">
              {(
                [
                  ['amountInitial', 'Inicial'],
                  ['amountPrimary', 'Primaria'],
                  ['amountSecondary', 'Secundaria'],
                ] as const
              ).map(([field, label]) => (
                <div key={field} className="space-y-1">
                  <label htmlFor="bulkobligationmodal-field-5" className="text-xs font-semibold text-foreground">{label} (S/)</label>
                  <Input id="bulkobligationmodal-field-5" type="number" step="0.01" min="0" placeholder="No cobrar" {...register(field)} className="h-9 text-xs font-mono font-bold" />
                </div>
              ))}
              <p className="col-span-3 text-xs text-muted-foreground">Deja vacío un nivel para no cobrarle este concepto.</p>
            </div>
          )}

          {/* Monto y Fecha Vencimiento */}
          <div className="grid grid-cols-2 gap-3">
            {!(byLevel && !scope) && (
              <div className="space-y-1">
                <label htmlFor="bulkobligationmodal-amountDue" className="text-xs font-semibold uppercase tracking-wide text-foreground">
                  Monto a Cobrar (S/)
                </label>
                <Input id="bulkobligationmodal-amountDue" type="number" step="0.01" {...register('amountDue')} className="h-9 text-sm font-bold text-primary" />
                {errors.amountDue && <p className="text-xs text-destructive">{errors.amountDue.message}</p>}
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="bulkobligationmodal-dueDate" className="text-xs font-semibold uppercase tracking-wide text-foreground">
                Fecha Vencimiento
              </label>
              <Input id="bulkobligationmodal-dueDate" type="date" {...register('dueDate')} className="h-9 text-xs" />
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
