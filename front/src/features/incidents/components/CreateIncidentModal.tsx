import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, AlertCircle, CalendarClock, User, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getApiErrorMessage } from '@/lib/errors';
import { useCreateIncident } from '../api/useIncidents';
import { useStudents } from '@/features/students/api/useStudents';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { createIncidentSchema, type CreateIncidentFormData } from '../schemas/incident.schema';
import { INCIDENT_TYPE_OPTIONS } from '../constants/incidentOptions';

interface CreateIncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultStudentId?: string;
}

export const CreateIncidentModal: React.FC<CreateIncidentModalProps> = ({ isOpen, onClose, defaultStudentId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [picked, setPicked] = useState<Array<{ id: string; name: string; room: string }>>([]);
  const [pickError, setPickError] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(searchTerm.trim(), 300);
  const { data: studentsData, isLoading: loadingStudents } = useStudents(
    { page: 1, limit: 50, search: debouncedSearch || undefined },
    isOpen,
  );

  const createMutation = useCreateIncident();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateIncidentFormData>({
    resolver: zodResolver(createIncidentSchema),
    defaultValues: {
      studentId: defaultStudentId || '',
      type: 'DEMERITO',
      severity: 'LOW',
      title: '',
      description: '',
      actionTaken: '',
      citationDate: '',
      isViolenceCase: false,
      notifyFamily: true,
    },
  });

  const selectedType = watch('type');
  const isViolenceCase = watch('isViolenceCase');

  if (!isOpen) return null;

  const students = studentsData?.data || [];

  const roomOf = (st: (typeof students)[number]) => {
    const c = st.enrollments?.find((e) => e.classroom)?.classroom as { grade?: number; section?: string } | undefined;
    return c?.grade ? `${c.grade}° "${c.section ?? ''}"` : '';
  };

  const onSubmit = async (data: CreateIncidentFormData) => {
    const targets = picked.length > 0 ? picked : defaultStudentId ? [{ id: defaultStudentId, name: '', room: '' }] : [];
    if (targets.length === 0) {
      setPickError('Elige al menos un estudiante.');
      return;
    }
    try {
      for (const t of targets) {
        await createMutation.mutateAsync({
          studentId: t.id,
          type: data.type,
          severity: data.type === 'MERITO' ? 'LOW' : data.severity,
          title: data.title,
          description: data.description,
          actionTaken: data.actionTaken || undefined,
          citationDate: data.citationDate || undefined,
          isViolenceCase: Boolean(data.isViolenceCase),
          notifyFamily: Boolean(data.notifyFamily),
        });
      }
      const who =
        targets.length === 1 ? 'Incidencia registrada' : `${targets.length} incidencias registradas (una por alumno)`;
      toast.success(
        data.notifyFamily ? `${who} y notificada(s) a los apoderados.` : `${who} sin aviso a las familias.`,
      );
      reset();
      setPicked([]);
      onClose();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Error al registrar la incidencia.'));
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border bg-muted/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-foreground">Registrar Incidencia / Tópico</h2>
              <p className="text-xs text-muted-foreground">Agenda escolar con notificación directa a las familias</p>
            </div>
          </div>

          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-8 w-8 hover:bg-muted">
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
            <div className="space-y-1.5">
              {picked.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {picked.map((p) => (
                    <span
                      key={p.id}
                      className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"
                    >
                      {p.name}
                      {p.room ? ` · ${p.room}` : ''}
                      <button
                        type="button"
                        aria-label={`Quitar a ${p.name}`}
                        onClick={() => setPicked((list) => list.filter((x) => x.id !== p.id))}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <input
                type="text"
                placeholder="Busca por apellido, nombre o DNI y elige (puedes agregar varios)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Buscar estudiante"
                className="w-full text-xs h-8 bg-background border border-border rounded-lg px-2.5 text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
              />
              {searchTerm.trim().length >= 2 && (
                <ul className="max-h-40 overflow-y-auto divide-y divide-border rounded-lg border border-border">
                  {students
                    .filter((st) => !picked.some((p) => p.id === st.id))
                    .slice(0, 12)
                    .map((st) => (
                      <li key={st.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setPicked((list) => [
                              ...list,
                              {
                                id: st.id,
                                name: `${st.lastNamePaternal} ${st.lastNameMaternal || ''}, ${st.firstNames}`.replace(
                                  /\s+,/,
                                  ',',
                                ),
                                room: roomOf(st),
                              },
                            ]);
                            setSearchTerm('');
                            setPickError(null);
                          }}
                          className="flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left text-xs hover:bg-muted"
                        >
                          <span>
                            {st.lastNamePaternal} {st.lastNameMaternal || ''}, {st.firstNames}
                          </span>
                          <span className="text-muted-foreground">{roomOf(st) || st.documentId}</span>
                        </button>
                      </li>
                    ))}
                </ul>
              )}
            </div>
            {pickError && <p className="text-xs text-destructive font-semibold">{pickError}</p>}
            {errors.studentId && <p className="text-xs text-destructive font-semibold">{errors.studentId.message}</p>}
          </div>

          {/* Tipo y Severidad */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="createincidentmodal-type" className="text-xs font-bold text-foreground">
                Tipo de Evento:
              </label>
              <select
                id="createincidentmodal-type"
                {...register('type')}
                className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                {INCIDENT_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {errors.type && <p className="text-xs text-destructive font-semibold">{errors.type.message}</p>}
            </div>

            {selectedType !== 'MERITO' && (
              <div className="space-y-1.5">
                <label htmlFor="createincidentmodal-severity" className="text-xs font-bold text-foreground">
                  Severidad:
                </label>
                <select
                  id="createincidentmodal-severity"
                  {...register('severity')}
                  className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="LOW">Baja / Informativa</option>
                  <option value="MEDIUM">Media</option>
                  <option value="HIGH">Alta</option>
                  <option value="CRITICAL">Grave / Urgente</option>
                </select>
              </div>
            )}
          </div>

          {/* Título */}
          <div className="space-y-1.5">
            <label htmlFor="createincidentmodal-title" className="text-xs font-bold text-foreground">
              Título de la Incidencia:
            </label>
            <Input
              id="createincidentmodal-title"
              {...register('title')}
              placeholder={
                selectedType === 'MERITO'
                  ? 'Ej. Ayudó a un compañero en clase'
                  : selectedType === 'ATENCION_TOPICO'
                    ? 'Ej. Fiebre y malestar estomacal en clase'
                    : selectedType === 'CITACION_PADRES'
                      ? 'Ej. Citación por inasistencias'
                      : 'Ej. Interrumpió la clase reiteradamente'
              }
              className="h-9 text-xs"
            />
            {errors.title && <p className="text-xs text-destructive font-semibold">{errors.title.message}</p>}
          </div>

          {/* Fecha de Citación si aplica */}
          {selectedType === 'CITACION_PADRES' && (
            <div className="space-y-1.5 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <label
                htmlFor="createincidentmodal-citationDate"
                className="text-xs font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5"
              >
                <CalendarClock className="w-3.5 h-3.5" />
                <span>Fecha y Hora de la Citación:</span>
              </label>
              <Input
                id="createincidentmodal-citationDate"
                type="datetime-local"
                {...register('citationDate')}
                className="h-9 text-xs bg-background"
              />
            </div>
          )}

          {/* Descripción */}
          <div className="space-y-1.5">
            <label htmlFor="createincidentmodal-description" className="text-xs font-bold text-foreground">
              Descripción detallada:
            </label>
            <textarea
              id="createincidentmodal-description"
              {...register('description')}
              rows={3}
              placeholder="Explica lo sucedido con claridad y objetividad..."
              className="w-full text-xs bg-background border border-border rounded-lg p-2.5 text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
            />
            {errors.description && (
              <p className="text-xs text-destructive font-semibold">{errors.description.message}</p>
            )}
          </div>

          {/* Medida o Acción Tomada */}
          <div className="space-y-1.5">
            <label htmlFor="createincidentmodal-actionTaken" className="text-xs font-bold text-muted-foreground">
              Medida adoptada / Acción tomada (Opcional):
            </label>
            <Input
              id="createincidentmodal-actionTaken"
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
                  Recuerda registrar el caso en <strong>siseve.minedu.gob.pe</strong> y luego anotar aquí el código
                  asignado.
                </span>
              </div>
            )}
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              {...register('notifyFamily')}
              className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
            />
            <span className="text-xs text-foreground leading-snug select-none">
              <strong>Avisar a la familia por la app</strong>
              <span className="block text-muted-foreground">
                Desmárcalo si prefieres conversarlo antes en persona; el registro queda igual en la agenda.
              </span>
            </span>
          </label>

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
              {isSubmitting ? 'Registrando...' : watch('notifyFamily') ? 'Guardar y avisar' : 'Guardar sin avisar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
