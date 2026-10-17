import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  X,
  Upload,
  FileText,
  Calendar,
  Loader2,
  BookOpen,
  ClipboardList,
  MessageSquare,
  Paperclip,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  createCourseContentSchema,
  type CreateCourseContentFormData,
} from '../schemas/course-content.schema';
import { useCreateCourseContent, useUploadMaterial } from '../api/useCourseContents';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface PublishContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseAssignmentId: string;
  defaultBimester?: number;
  courseTitle: string;
}

export const PublishContentModal: React.FC<PublishContentModalProps> = ({
  isOpen,
  onClose,
  courseAssignmentId,
  defaultBimester = 1,
  courseTitle,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { mutateAsync: uploadFile } = useUploadMaterial();
  const { mutateAsync: createContent, isPending: isCreating } = useCreateCourseContent();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateCourseContentFormData>({
    resolver: zodResolver(createCourseContentSchema),
    defaultValues: {
      courseAssignmentId,
      bimester: defaultBimester,
      contentType: 'LESSON_MATERIAL',
      title: '',
      description: '',
    },
  });

  const currentType = watch('contentType');
  const currentBimester = watch('bimester');

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 30 * 1024 * 1024) {
        toast.error('El archivo supera el límite de 30 MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const onSubmit = async (data: CreateCourseContentFormData) => {
    try {
      let fileUrl = data.fileUrl;
      let fileName = data.fileName;
      let fileType = data.fileType;
      let fileSize = data.fileSize;

      if (selectedFile) {
        setIsUploading(true);
        const uploaded = await uploadFile(selectedFile);
        fileUrl = uploaded.url;
        fileName = uploaded.fileName;
        fileType = uploaded.fileType;
        fileSize = uploaded.fileSize;
        setIsUploading(false);
      }

      await createContent({
        ...data,
        courseAssignmentId,
        bimester: Number(data.bimester),
        fileUrl,
        fileName,
        fileType,
        fileSize,
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : undefined,
      });

      toast.success('Publicación creada con éxito');
      reset();
      setSelectedFile(null);
      onClose();
    } catch (err: unknown) {
      setIsUploading(false);
      const msg = err instanceof Error ? err.message : 'Error al guardar la publicación';
      toast.error(msg);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-foreground">Publicar en Aula Virtual</h2>
            <p className="text-xs text-muted-foreground">{courseTitle}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Tipo de Publicación */}
          <div className="space-y-1.5">
            <label className="font-semibold text-foreground">Tipo de Contenido:</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setValue('contentType', 'LESSON_MATERIAL')}
                className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-semibold ${
                  currentType === 'LESSON_MATERIAL'
                    ? 'border-primary bg-primary/10 text-primary shadow-sm'
                    : 'border-border bg-background text-muted-foreground hover:bg-muted'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Clase / Material</span>
              </button>
              <button
                type="button"
                onClick={() => setValue('contentType', 'HOMEWORK')}
                className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-semibold ${
                  currentType === 'HOMEWORK'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 shadow-sm'
                    : 'border-border bg-background text-muted-foreground hover:bg-muted'
                }`}
              >
                <ClipboardList className="w-4 h-4" />
                <span>Tarea Escolar</span>
              </button>
              <button
                type="button"
                onClick={() => setValue('contentType', 'FORUM')}
                className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-semibold ${
                  currentType === 'FORUM'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'border-border bg-background text-muted-foreground hover:bg-muted'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Foro de Debate</span>
              </button>
            </div>
          </div>

          {/* Bimestre */}
          <div className="space-y-1.5">
            <label className="font-semibold text-foreground">Bimestre Correspondiente:</label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((bim) => (
                <button
                  key={bim}
                  type="button"
                  onClick={() => setValue('bimester', bim)}
                  className={`py-1.5 rounded-lg border text-xs font-bold transition-all ${
                    currentBimester === bim
                      ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                      : 'border-border bg-background text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {bim}° Bimestre
                </button>
              ))}
            </div>
          </div>

          {/* Título */}
          <div className="space-y-1.5">
            <label className="font-semibold text-foreground">Título:</label>
            <Input
              {...register('title')}
              placeholder={
                currentType === 'LESSON_MATERIAL'
                  ? 'Ej: Sesión 04: Las Leyes de Newton (Diapositivas)'
                  : currentType === 'HOMEWORK'
                  ? 'Ej: Ficha de Actividades: Ejercicios 1 al 10'
                  : 'Ej: Foro de Debate: ¿Cómo impacta el cambio climático en tu región?'
              }
              className="text-xs"
            />
            {errors.title && <p className="text-destructive text-[11px]">{errors.title.message}</p>}
          </div>

          {/* Descripción / Indicaciones */}
          <div className="space-y-1.5">
            <label className="font-semibold text-foreground">
              {currentType === 'FORUM' ? 'Pregunta disparadora / Tema de debate:' : 'Instrucciones o descripción:'}
            </label>
            <Textarea
              {...register('description')}
              rows={3}
              placeholder="Escribe las indicaciones para los estudiantes..."
              className="text-xs resize-none"
            />
          </div>

          {/* Fecha Límite si es Tarea */}
          {currentType === 'HOMEWORK' && (
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-500" />
                <span>Fecha Límite de Entrega:</span>
              </label>
              <Input type="date" {...register('dueDate')} className="text-xs" />
            </div>
          )}

          {/* Archivo adjunto (para Clase y Tarea) */}
          {currentType !== 'FORUM' && (
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground flex items-center gap-1">
                <Paperclip className="w-3.5 h-3.5 text-primary" />
                <span>Documento Adjunto (PPT, Word, PDF, Excel o imagen):</span>
              </label>

              {selectedFile ? (
                <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/30">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FileText className="w-5 h-5 text-primary shrink-0" />
                    <div className="truncate">
                      <p className="font-medium text-foreground truncate">{selectedFile.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedFile(null)}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    Quitar
                  </Button>
                </div>
              ) : (
                <label className="border-2 border-dashed border-border hover:border-primary/50 bg-background hover:bg-muted/30 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all">
                  <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                  <span className="font-semibold text-foreground">Haz clic para subir un archivo</span>
                  <span className="text-[10px] text-muted-foreground">
                    Soporta PowerPoint (.pptx), Word (.docx), PDF, Excel o Imágenes (máx. 30MB)
                  </span>
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                  />
                </label>
              )}
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose} disabled={isCreating || isUploading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isCreating || isUploading} className="gap-2 font-bold">
              {isCreating || isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isUploading ? 'Subiendo archivo...' : 'Guardando...'}</span>
                </>
              ) : (
                <span>Publicar Contenido</span>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
