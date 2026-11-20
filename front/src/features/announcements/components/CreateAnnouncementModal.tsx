import React, { useRef, useState } from 'react';
import { useUploadMaterial } from '@/features/course-contents/api/useCourseContents';
import type { AnnouncementAttachment } from '../types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, Send, AlertTriangle, Bell, Info, Loader2 } from 'lucide-react';
import {
  createAnnouncementSchema,
  parsePollOptions,
  type CreateAnnouncementFormData,
} from '../schemas/announcement.schema';
import { useCreateAnnouncement } from '../api/useAnnouncements';
import { useClassrooms } from '@/features/classrooms/api/useClassrooms';
import { toast } from 'sonner';
import { getPeruToday } from '@/lib/dateUtils';
import { getApiErrorMessage } from '@/lib/errors';
import { endOfDayLima, expiryPresets } from '../lib/expiry';
import { useAuthStore } from '@/store/useAuthStore';
import { AnnouncementScopeSelector } from './create-announcement-modal/AnnouncementScopeSelector';
import { AnnouncementAttachmentManager } from './create-announcement-modal/AnnouncementAttachmentManager';
import { AnnouncementResponseAndExpiryFields } from './create-announcement-modal/AnnouncementResponseAndExpiryFields';

type ScopeLevel = 'INITIAL' | 'PRIMARY' | 'SECONDARY';
/** Traduce el valor del selector de alcance al payload del API. */
const parseScope = (
  value?: string,
): { classroomId?: string; targetLevel?: ScopeLevel | null; targetGrade?: number | null } => {
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

export const CreateAnnouncementModal: React.FC<CreateAnnouncementModalProps> = ({ isOpen, onClose }) => {
  const { mutateAsync: createAnnouncement, isPending } = useCreateAnnouncement();
  const upload = useUploadMaterial();
  const [attachments, setAttachments] = useState<AnnouncementAttachment[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);

  const addFiles = async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      if (attachments.length >= 3) {
        toast.error('Puedes adjuntar hasta 3 archivos.');
        break;
      }
      try {
        const r = await upload.mutateAsync({ file, purpose: 'SCHOOL_ASSET' });
        setAttachments((list) =>
          [...list, { fileId: r.fileId, name: r.fileName, size: r.fileSize, type: r.fileType }].slice(0, 3),
        );
      } catch (error: unknown) {
        toast.error(getApiErrorMessage(error, `No se pudo subir ${file.name}.`));
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
  const responseType = watch('responseType');
  const selectedRoles = watch('targetRoles') || [];
  const expiresAt = watch('expiresAt') || '';
  const responseDeadline = watch('responseDeadline') || '';
  const today = getPeruToday();
  const presets = expiryPresets(today, responseType !== 'NONE' ? responseDeadline || undefined : undefined);

  if (!isOpen) return null;

  const handleRoleToggle = (role: 'SUPER_ADMIN' | 'SCHOOL_ADMIN' | 'ADMINISTRATIVE' | 'TEACHER' | 'PARENT') => {
    if (selectedRoles.includes(role)) {
      setValue(
        'targetRoles',
        selectedRoles.filter((r) => r !== role),
      );
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
        expiresAt: data.expiresAt ? endOfDayLima(data.expiresAt) : null,
        responseType: data.responseType,
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
      toast.error(getApiErrorMessage(error, 'No se pudo publicar el comunicado.'));
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
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
            <label
              htmlFor="createannouncementmodal-title"
              className="block text-xs font-semibold text-muted-foreground uppercase mb-1"
            >
              Título del Comunicado *
            </label>
            <input
              id="createannouncementmodal-title"
              type="text"
              placeholder="Ej: Citación a Reunión General de Padres"
              {...register('title')}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.title && <p className="mt-1 text-xs text-destructive">{errors.title.message}</p>}
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
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Destinatarios *</label>
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
            {errors.targetRoles && <p className="mt-1 text-xs text-destructive">{errors.targetRoles.message}</p>}
          </div>

          <AnnouncementScopeSelector
            isTeacher={isTeacher}
            classrooms={classrooms}
            register={register}
          />

          <div>
            <label
              htmlFor="createannouncementmodal-content"
              className="block text-xs font-semibold text-muted-foreground uppercase mb-1"
            >
              Contenido del Mensaje *
            </label>
            <textarea
              id="createannouncementmodal-content"
              rows={4}
              placeholder="Escribe el aviso oficial aquí..."
              {...register('content')}
              className="w-full rounded-xl border border-border bg-background p-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.content && <p className="mt-1 text-xs text-destructive">{errors.content.message}</p>}
          </div>

          <AnnouncementAttachmentManager
            attachments={attachments}
            isPending={upload.isPending}
            fileInputRef={fileInput}
            onAddFiles={addFiles}
            onRemoveAttachment={(fileId) => setAttachments((list) => list.filter((x) => x.fileId !== fileId))}
          />

          <AnnouncementResponseAndExpiryFields
            responseType={responseType}
            expiresAt={expiresAt}
            today={today}
            presets={presets}
            register={register}
            errors={errors}
            onSelectResponseType={(type) => setValue('responseType', type, { shouldValidate: true })}
            onSelectExpiryPreset={(val) => setValue('expiresAt', val, { shouldValidate: true })}
          />

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
