import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, Send, AlertTriangle, Bell, Info, Loader2 } from 'lucide-react';
import { createAnnouncementSchema, parsePollOptions, type CreateAnnouncementFormData } from '../schemas/announcement.schema';
import { useCreateAnnouncement } from '../api/useAnnouncements';
import { useClassrooms } from '@/features/classrooms/api/useClassrooms';
import { toast } from 'sonner';

interface CreateAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateAnnouncementModal: React.FC<CreateAnnouncementModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { mutateAsync: createAnnouncement, isPending } = useCreateAnnouncement();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateAnnouncementFormData>({
    resolver: zodResolver(createAnnouncementSchema),
    defaultValues: {
      title: '',
      content: '',
      priority: 'NORMAL',
      targetRoles: ['PARENT', 'TEACHER'],
      responseType: 'NONE',
      classroomId: '',
      responseDeadline: '',
      pollOptionsText: '',
    },
  });
  const { data: classrooms = [] } = useClassrooms();
  const responseType = watch('responseType');

  const selectedRoles = watch('targetRoles') || [];

  if (!isOpen) return null;

  const handleRoleToggle = (role: 'SUPER_ADMIN' | 'SCHOOL_ADMIN' | 'ADMINISTRATIVE' | 'TEACHER' | 'PARENT') => {
    if (selectedRoles.includes(role)) {
      setValue('targetRoles', selectedRoles.filter((r) => r !== role));
    } else {
      setValue('targetRoles', [...selectedRoles, role]);
    }
  };

  const onSubmit = async (data: CreateAnnouncementFormData) => {
    try {
      await createAnnouncement({
        title: data.title,
        content: data.content,
        priority: data.priority,
        targetRoles: data.targetRoles,
        classroomId: data.classroomId || undefined,
        expiresAt: data.expiresAt ? new Date(data.expiresAt).toISOString() : undefined,
        responseType: data.responseType,
        // Fecha límite al final del día indicado (hora de Lima)
        responseDeadline:
          data.responseType !== 'NONE' && data.responseDeadline
            ? new Date(`${data.responseDeadline}T23:59:59-05:00`).toISOString()
            : null,
        pollOptions: data.responseType === 'POLL' ? parsePollOptions(data.pollOptionsText) : [],
      });
      toast.success('Comunicado publicado');
      reset();
      onClose();
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'No se pudo publicar el comunicado.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Publicar Nuevo Comunicado
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
              Título del Comunicado *
            </label>
            <input
              type="text"
              placeholder="Ej: Citación a Reunión General de Padres"
              {...register('title')}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.title && (
              <p className="mt-1 text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
              Nivel de Prioridad *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'NORMAL', label: 'Normal', icon: Info, color: 'hover:border-primary' },
                { id: 'IMPORTANT', label: 'Importante', icon: Bell, color: 'hover:border-amber-500' },
                { id: 'URGENT', label: 'Urgente', icon: AlertTriangle, color: 'hover:border-destructive' },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setValue('priority', id as any)}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                    watch('priority') === id
                      ? 'border-primary bg-primary/10 text-primary shadow-sm'
                      : 'border-border bg-background text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
              Destinatarios *
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { role: 'PARENT', label: 'Apoderados / Padres' },
                { role: 'TEACHER', label: 'Profesores / Docentes' },
                { role: 'ADMINISTRATIVE', label: 'Personal Administrativo' },
                { role: 'SCHOOL_ADMIN', label: 'Dirección' },
              ].map(({ role, label }) => {
                const isSelected = selectedRoles.includes(role as any);
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => handleRoleToggle(role as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      isSelected
                        ? 'bg-secondary text-secondary-foreground border-primary'
                        : 'bg-background text-muted-foreground border-border hover:bg-secondary/50'
                    }`}
                  >
                    {isSelected ? '✓ ' : '+ '}
                    {label}
                  </button>
                );
              })}
            </div>
            {errors.targetRoles && (
              <p className="mt-1 text-xs text-destructive">{errors.targetRoles.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="announcement-classroom" className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
              Alcance
            </label>
            <select
              id="announcement-classroom"
              {...register('classroomId')}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Todo el colegio</option>
              {classrooms.map((c) => (
                <option key={c.id} value={c.id}>
                  Solo {c.educationLevel === 'INITIAL' ? `${c.grade} años` : `${c.grade}.°`} "{c.section}" ·{' '}
                  {c.educationLevel === 'INITIAL' ? 'Inicial' : c.educationLevel === 'PRIMARY' ? 'Primaria' : 'Secundaria'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
              Contenido del Mensaje *
            </label>
            <textarea
              rows={4}
              placeholder="Escribe el aviso oficial aquí..."
              {...register('content')}
              className="w-full rounded-xl border border-border bg-background p-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.content && (
              <p className="mt-1 text-xs text-destructive">{errors.content.message}</p>
            )}
          </div>

          <div className="rounded-xl border border-border p-3 space-y-2.5">
            <span className="block text-xs font-semibold text-muted-foreground uppercase">¿Pedir respuesta a las familias?</span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { id: 'NONE', label: 'No' },
                { id: 'ACKNOWLEDGE', label: 'Leído y enterado' },
                { id: 'AUTHORIZATION', label: 'Autorización' },
                { id: 'POLL', label: 'Encuesta' },
              ].map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setValue('responseType', o.id as CreateAnnouncementFormData['responseType'], { shouldValidate: true })}
                  className={`rounded-lg border px-2 py-2 text-xs font-semibold transition-colors ${
                    responseType === o.id ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground hover:bg-secondary'
                  }`}
                  aria-pressed={responseType === o.id}
                >
                  {o.label}
                </button>
              ))}
            </div>
            {errors.responseType && <p className="text-xs text-destructive">{errors.responseType.message}</p>}
            {responseType === 'AUTHORIZATION' && (
              <p className="text-[11px] text-muted-foreground">
                Cada familia responde “Autorizo” o “No autorizo” por cada hijo. Se guarda la fecha y el dispositivo como constancia.
              </p>
            )}
            {responseType === 'POLL' && (
              <div>
                <label htmlFor="poll-options" className="block text-[11px] font-medium text-foreground mb-1">
                  Opciones (una por línea, máximo 6)
                </label>
                <textarea
                  id="poll-options"
                  rows={3}
                  placeholder="Sí asistiré"
                  {...register('pollOptionsText')}
                  className="w-full rounded-lg border border-border bg-background p-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {errors.pollOptionsText && <p className="mt-1 text-xs text-destructive">{errors.pollOptionsText.message}</p>}
              </div>
            )}
            {responseType !== 'NONE' && (
              <div>
                <label htmlFor="response-deadline" className="block text-[11px] font-medium text-foreground mb-1">
                  Responder hasta (opcional)
                </label>
                <input
                  id="response-deadline"
                  type="date"
                  {...register('responseDeadline')}
                  className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 disabled:opacity-50 transition-all"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Publicando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Publicar Comunicado
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
