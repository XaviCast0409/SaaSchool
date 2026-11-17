import React, { useRef, useState } from 'react';
import { Paperclip, X as XIcon } from 'lucide-react';
import { useUploadMaterial } from '@/features/course-contents/api/useCourseContents';
import type { AnnouncementAttachment } from '../types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, Send, AlertTriangle, Bell, Info, Loader2, CalendarClock } from 'lucide-react';
import { createAnnouncementSchema, parsePollOptions, type CreateAnnouncementFormData } from '../schemas/announcement.schema';
import { useCreateAnnouncement } from '../api/useAnnouncements';
import { useClassrooms } from '@/features/classrooms/api/useClassrooms';
import { toast } from 'sonner';
import { getPeruToday, formatPeruDate } from '@/lib/dateUtils';
import { endOfDayLima, expiryPresets, UNDATED_ARCHIVE_DAYS } from '../lib/expiry';
import { useAuthStore } from '@/store/useAuthStore';

type ScopeLevel = 'INITIAL' | 'PRIMARY' | 'SECONDARY';
/** Traduce el valor del selector de alcance al payload del API. */
const parseScope = (value?: string): { classroomId?: string; targetLevel?: ScopeLevel | null; targetGrade?: number | null } => {
  if (!value) return {};
  if (value.startsWith('L:')) return { targetLevel: value.slice(2) as ScopeLevel };
  if (value.startsWith('G:')) {
    const [, level, grade] = value.split(':');
    return { targetLevel: level as ScopeLevel, targetGrade: Number(grade) };
  }
  return { classroomId: value };
};

interface CreateAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateAnnouncementModal: React.FC<CreateAnnouncementModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { mutateAsync: createAnnouncement, isPending } = useCreateAnnouncement();
  // Adjuntos: se suben al elegirlos (como los materiales) y se envían con el comunicado
  const upload = useUploadMaterial();
  const [attachments, setAttachments] = useState<AnnouncementAttachment[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const addFiles = async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      if (attachments.length >= 3) { toast.error('Puedes adjuntar hasta 3 archivos.'); break; }
      try {
        const r = await upload.mutateAsync({ file, purpose: 'SCHOOL_ASSET' });
        setAttachments((list) => [...list, { fileId: r.fileId, name: r.fileName, size: r.fileSize, type: r.fileType }].slice(0, 3));
      } catch (error: unknown) {
        const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
        toast.error(msg || `No se pudo subir ${file.name}.`);
      }
    }
    if (fileInput.current) fileInput.current.value = '';
  };
  const currentUser = useAuthStore((s) => s.user);
  const isTeacher = currentUser?.role === 'TEACHER';

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
      targetRoles: isTeacher ? ['PARENT'] : ['PARENT', 'TEACHER'],
      responseType: 'NONE',
      classroomId: '',
      expiresAt: '',
      responseDeadline: '',
      pollOptionsText: '',
    },
  });
  const { data: classrooms = [] } = useClassrooms();
  // Niveles y grados que el colegio tiene abiertos, para dirigir un comunicado a todo un nivel o grado
  const LEVEL_NAME: Record<string, string> = { INITIAL: 'Inicial', PRIMARY: 'Primaria', SECONDARY: 'Secundaria' };
  const gradeName = (level: string, grade: number) => (level === 'INITIAL' ? `${grade} años` : `${grade}.°`);
  const levelOptions = [...new Set(classrooms.map((c) => c.educationLevel))];
  const gradeOptions = [...new Map(classrooms.map((c) => [`${c.educationLevel}:${c.grade}`, c])).values()]
    .sort((a, b) => a.educationLevel.localeCompare(b.educationLevel) || a.grade - b.grade);
  const responseType = watch('responseType');

  const selectedRoles = watch('targetRoles') || [];
  const expiresAt = watch('expiresAt') || '';
  const responseDeadline = watch('responseDeadline') || '';
  const today = getPeruToday();
  const presets = expiryPresets(today, responseType !== 'NONE' ? responseDeadline || undefined : undefined);

  if (!isOpen) return null;

  const handleRoleToggle = (role: 'SUPER_ADMIN' | 'SCHOOL_ADMIN' | 'ADMINISTRATIVE' | 'TEACHER' | 'PARENT') => {
    if (selectedRoles.includes(role)) {
      setValue('targetRoles', selectedRoles.filter((r) => r !== role));
    } else {
      setValue('targetRoles', [...selectedRoles, role]);
    }
  };

  const onSubmit = async (data: CreateAnnouncementFormData) => {
    if (isTeacher && !data.classroomId) {
      toast.error('Elige un aula para publicar el comunicado.');
      return;
    }
    try {
      await createAnnouncement({
        title: data.title,
        content: data.content,
        priority: data.priority,
        targetRoles: data.targetRoles,
        ...parseScope(data.classroomId),
        // Visible hasta el final del día indicado (hora de Lima)
        expiresAt: data.expiresAt ? endOfDayLima(data.expiresAt) : null,
        responseType: data.responseType,
        // Fecha límite al final del día indicado (hora de Lima)
        responseDeadline:
          data.responseType !== 'NONE' && data.responseDeadline
            ? new Date(`${data.responseDeadline}T23:59:59-05:00`).toISOString()
            : null,
        pollOptions: data.responseType === 'POLL' ? parsePollOptions(data.pollOptionsText) : [],
        attachments,
      });
      toast.success('Comunicado publicado');
      reset();
      setAttachments([]);
      onClose();
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'No se pudo publicar el comunicado.');
    }
  };

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
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
            <label htmlFor="createannouncementmodal-title" className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
              Título del Comunicado *
            </label>
            <input id="createannouncementmodal-title"
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
              {(isTeacher
                ? [
                    { role: 'PARENT' as const, label: 'Apoderados / Padres' },
                    { role: 'TEACHER' as const, label: 'Profesores / Docentes' },
                  ]
                : [
                    { role: 'PARENT' as const, label: 'Apoderados / Padres' },
                    { role: 'TEACHER' as const, label: 'Profesores / Docentes' },
                    { role: 'ADMINISTRATIVE' as const, label: 'Personal Administrativo' },
                    { role: 'SCHOOL_ADMIN' as const, label: 'Dirección' },
                  ]
              ).map(({ role, label }) => {
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
              Alcance {isTeacher && <span className="text-destructive">*</span>}
            </label>
            <select
              id="announcement-classroom"
              {...register('classroomId')}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {!isTeacher && <option value="">Todo el colegio</option>}
              {isTeacher && <option value="">-- Selecciona tu aula (obligatorio) --</option>}
              {!isTeacher && levelOptions.length > 0 && (
                <optgroup label="Por nivel">
                  {levelOptions.map((l) => <option key={l} value={`L:${l}`}>Todo {LEVEL_NAME[l]}</option>)}
                </optgroup>
              )}
              {!isTeacher && gradeOptions.length > 0 && (
                <optgroup label="Por grado">
                  {gradeOptions.map((c) => (
                    <option key={`${c.educationLevel}:${c.grade}`} value={`G:${c.educationLevel}:${c.grade}`}>
                      Todo {gradeName(c.educationLevel, c.grade)} de {LEVEL_NAME[c.educationLevel]}
                    </option>
                  ))}
                </optgroup>
              )}
              <optgroup label="Un aula">
                {classrooms.map((c) => (
                  <option key={c.id} value={c.id}>
                    Solo {gradeName(c.educationLevel, c.grade)} "{c.section}" · {LEVEL_NAME[c.educationLevel]}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <div>
            <label htmlFor="createannouncementmodal-content" className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
              Contenido del Mensaje *
            </label>
            <textarea id="createannouncementmodal-content"
              rows={4}
              placeholder="Escribe el aviso oficial aquí..."
              {...register('content')}
              className="w-full rounded-xl border border-border bg-background p-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.content && (
              <p className="mt-1 text-xs text-destructive">{errors.content.message}</p>
            )}
          </div>

          <div>
            <span className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Archivos adjuntos (opcional)</span>
            {attachments.length > 0 && (
              <ul className="mb-2 space-y-1">
                {attachments.map((a) => (
                  <li key={a.fileId} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-1.5 text-xs">
                    <span className="truncate">{a.name} <span className="text-muted-foreground">· {(a.size / 1024 / 1024).toFixed(1)} MB</span></span>
                    <button type="button" aria-label={`Quitar ${a.name}`} onClick={() => setAttachments((list) => list.filter((x) => x.fileId !== a.fileId))}>
                      <XIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <input ref={fileInput} type="file" multiple className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.webp" onChange={(e) => void addFiles(e.target.files)} />
            <button
              type="button"
              disabled={upload.isPending || attachments.length >= 3}
              onClick={() => fileInput.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary disabled:opacity-50"
            >
              {upload.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
              {upload.isPending ? 'Subiendo…' : 'Adjuntar archivo (PDF, Word, imagen…)'}
            </button>
            <p className="mt-1 text-[10px] text-muted-foreground">Hasta 3 archivos de 25 MB. Las familias los abren desde el comunicado.</p>
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
              <p className="text-xs text-muted-foreground">
                Cada familia responde “Autorizo” o “No autorizo” por cada hijo. Se guarda la fecha y el dispositivo como constancia.
              </p>
            )}
            {responseType === 'POLL' && (
              <div>
                <label htmlFor="poll-options" className="block text-xs font-medium text-foreground mb-1">
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
                <label htmlFor="response-deadline" className="block text-xs font-medium text-foreground mb-1">
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

          <div className="rounded-xl border border-border p-3 space-y-2.5">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase">
              <CalendarClock className="w-3.5 h-3.5" aria-hidden /> Visible en el muro hasta
            </span>
            <div className="flex flex-wrap gap-2">
              {presets.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setValue('expiresAt', p.value, { shouldValidate: true })}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    expiresAt === p.value ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground hover:bg-secondary'
                  }`}
                  aria-pressed={expiresAt === p.value}
                >
                  {p.label}
                </button>
              ))}
              <input
                id="announcement-expires"
                type="date"
                min={today}
                aria-label="Otra fecha"
                {...register('expiresAt')}
                className="rounded-lg border border-border bg-background px-2.5 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {expiresAt
                ? `Se verá en “Vigentes” hasta el ${formatPeruDate(expiresAt)}. Después pasa a “Anteriores”, donde se puede seguir consultando.`
                : `Sin fecha: pasa a “Anteriores” a los ${UNDATED_ARCHIVE_DAYS} días de publicado. Si es sobre un evento, elige la fecha del evento.`}
            </p>
            {errors.expiresAt && <p className="text-xs text-destructive">{errors.expiresAt.message}</p>}
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
