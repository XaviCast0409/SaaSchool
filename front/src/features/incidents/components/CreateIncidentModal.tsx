import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  X,
  AlertCircle,
  Award,
  Stethoscope,
  CalendarClock,
  User,
  ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCreateIncident } from '../api/useIncidents';
import { useStudents } from '@/features/students/api/useStudents';
import type { IncidentType } from '../types';

const incidentSchema = z.object({
  studentId: z.string().min(1, 'Selecciona un estudiante'),
  type: z.enum([
    'MERITO',
    'DEMERITO',
    'ATENCION_TOPICO',
    'CITACION_PADRES',
    'BEHAVIORAL',
    'HEALTH',
    'ACADEMIC',
    'CITATION',
    'POSITIVE',
  ]),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  title: z.string().min(3, 'El título debe tener al menos 3 caracteres'),
  description: z.string().min(5, 'La descripción debe tener al menos 5 caracteres'),
  actionTaken: z.string().optional(),
  citationDate: z.string().optional(),
  isViolenceCase: z.boolean().default(false),
});

type FormData = z.infer<typeof incidentSchema>;

interface CreateIncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultStudentId?: string;
}

const TYPE_OPTIONS: Array<{ value: IncidentType; label: string; icon: React.ReactNode }> = [
  { value: 'MERITO', label: 'Mérito / Reconocimiento', icon: <Award className="w-4 h-4 text-emerald-500" /> },
  { value: 'DEMERITO', label: 'Falta / Demérito Conductual', icon: <AlertCircle className="w-4 h-4 text-amber-500" /> },
  { value: 'ATENCION_TOPICO', label: 'Atención en Tópico / Enfermería', icon: <Stethoscope className="w-4 h-4 text-blue-500" /> },
  { value: 'CITACION_PADRES', label: 'Citación a Padres / Entrevista', icon: <CalendarClock className="w-4 h-4 text-purple-500" /> },
];

export const CreateIncidentModal: React.FC<CreateIncidentModalProps> = ({
  isOpen,
  onClose,
  defaultStudentId,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: studentsData, isLoading: loadingStudents } = useStudents(
    { page: 1, limit: 50, search: searchTerm || undefined },
    isOpen,
  );

  const createMutation = useCreateIncident();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(incidentSchema),
    defaultValues: {
      studentId: defaultStudentId || '',
      type: 'DEMERITO',
      severity: 'LOW',
      title: '',
      description: '',
      actionTaken: '',
      citationDate: '',
      isViolenceCase: false,
    },
  });

  const selectedType = watch('type');
  const isViolenceCase = watch('isViolenceCase');

  if (!isOpen) return null;

  const students = studentsData?.data || [];

  const onSubmit = async (data: FormData) => {
    try {
      await createMutation.mutateAsync({
        studentId: data.studentId,
        type: data.type,
        severity: data.severity,
        title: data.title,
        description: data.description,
        actionTaken: data.actionTaken || undefined,
        citationDate: data.citationDate || undefined,
        isViolenceCase: Boolean(data.isViolenceCase),
      });

      toast.success('Incidencia registrada y notificada a los apoderados.');
      reset();
      onClose();
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Error al registrar la incidencia.';
      toast.error(errorMsg);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border bg-muted/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-foreground">
                Registrar Incidencia / Tópico
              </h2>
              <p className="text-xs text-muted-foreground">
                Agenda escolar con notificación directa a las familias
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full h-8 w-8 hover:bg-muted"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {/* Estudiante */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-primary" />
              <span>Estudiante:</span>
            </label>
            <div className="space-y-1">
              <input
                type="text"
                placeholder="Filtrar por apellido o documento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs h-8 bg-background border border-border rounded-lg px-2.5 text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
              />
              <select
                {...register('studentId')}
                className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                <option value="">— Selecciona un Estudiante —</option>
                {students.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.lastNamePaternal} {st.lastNameMaternal || ''}, {st.firstNames} (
                    {st.documentType}: {st.documentId})
                  </option>
                ))}
              </select>
            </div>
            {errors.studentId && (
              <p className="text-[11px] text-destructive font-semibold">
                {errors.studentId.message}
              </p>
            )}
          </div>

          {/* Tipo y Severidad */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Tipo de Evento:</label>
              <select
                {...register('type')}
                className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                {TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {errors.type && (
                <p className="text-[11px] text-destructive font-semibold">
                  {errors.type.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Severidad:</label>
              <select
                {...register('severity')}
                className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                <option value="LOW">Baja / Informativa</option>
                <option value="MEDIUM">Media</option>
                <option value="HIGH">Alta</option>
                <option value="CRITICAL">Grave / Urgente</option>
              </select>
            </div>
          </div>

          {/* Título */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Título de la Incidencia:</label>
            <Input
              {...register('title')}
              placeholder="Ej. Fiebre y malestar estomacal en clase"
              className="h-9 text-xs"
            />
            {errors.title && (
              <p className="text-[11px] text-destructive font-semibold">
                {errors.title.message}
              </p>
            )}
          </div>

          {/* Fecha de Citación si aplica */}
          {selectedType === 'CITACION_PADRES' && (
            <div className="space-y-1.5 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <label className="text-xs font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                <CalendarClock className="w-3.5 h-3.5" />
                <span>Fecha y Hora de la Citación:</span>
              </label>
              <Input
                type="datetime-local"
                {...register('citationDate')}
                className="h-9 text-xs bg-background"
              />
            </div>
          )}

          {/* Descripción */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Descripción detallada:</label>
            <textarea
              {...register('description')}
              rows={3}
              placeholder="Explica lo sucedido con claridad y objetividad..."
              className="w-full text-xs bg-background border border-border rounded-lg p-2.5 text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
            />
            {errors.description && (
              <p className="text-[11px] text-destructive font-semibold">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Medida o Acción Tomada */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground">
              Medida adoptada / Acción tomada (Opcional):
            </label>
            <Input
              {...register('actionTaken')}
              placeholder="Ej. Se aplicó compresa fría, se llamó al padre, etc."
              className="h-9 text-xs"
            />
          </div>

          {/* Convivencia Escolar / SíseVe */}
          <div className="space-y-2 pt-1 border-t border-border/60">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                {...register('isViolenceCase')}
                className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary"
              />
              <span className="text-xs font-bold text-foreground leading-snug select-none">
                Caso de violencia escolar (debe reportarse en el portal SíseVe del MINEDU)
              </span>
            </label>

            {isViolenceCase && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Recuerda registrar el caso en <strong>siseve.minedu.gob.pe</strong> y luego anotar aquí el código asignado.
                </span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs font-bold"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || loadingStudents}
              className="text-xs font-black bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSubmitting ? 'Registrando...' : 'Guardar y Notificar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
