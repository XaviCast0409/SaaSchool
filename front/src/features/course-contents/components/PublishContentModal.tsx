import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { usePeriods } from '@/features/academic-years/api/useAcademicYears';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ContentType } from '../types';
import { createCourseContentSchema, type CreateCourseContentFormData } from '../schemas/course-content.schema';
import { useCreateCourseContent, useUploadMaterial } from '../api/useCourseContents';
import { Button } from '@/components/ui/button';
import { getApiErrorMessage } from '@/lib/errors';
import { PublishContentTypeAndFields } from './publish-content-modal/PublishContentTypeAndFields';
import { PublishAttachmentSection } from './publish-content-modal/PublishAttachmentSection';

interface PublishContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseAssignmentId: string;
  defaultBimester?: number;
  defaultContentType?: ContentType;
  courseTitle: string;
}

export const PublishContentModal: React.FC<PublishContentModalProps> = ({
  isOpen,
  onClose,
  courseAssignmentId,
  defaultBimester = 1,
  defaultContentType = 'LESSON_MATERIAL',
  courseTitle,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [attachmentMode, setAttachmentMode] = useState<'FILE' | 'DRIVE'>('FILE');
  const [driveUrl, setDriveUrl] = useState('');
  const [driveFileName, setDriveFileName] = useState('');

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
      contentType: defaultContentType,
      title: '',
      description: '',
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      if (defaultContentType) {
        setValue('contentType', defaultContentType);
      }
      if (defaultBimester) {
        setValue('bimester', defaultBimester);
      }
    }
  }, [isOpen, defaultContentType, defaultBimester, setValue]);

  const currentType = watch('contentType');
  const currentBimester = watch('bimester');
  const { periods, label: periodLabel } = usePeriods();

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 25 * 1024 * 1024) {
        toast.error('El archivo supera el límite de 25 MB');
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

      if (attachmentMode === 'FILE' && selectedFile) {
        setIsUploading(true);
        const uploaded = await uploadFile(selectedFile);
        fileUrl = uploaded.url;
        fileName = uploaded.fileName;
        fileType = uploaded.fileType;
        fileSize = uploaded.fileSize;
        setIsUploading(false);
      } else if (attachmentMode === 'DRIVE' && driveUrl.trim()) {
        fileUrl = driveUrl.trim();
        fileName = driveFileName.trim() || data.title;
        fileType = 'application/pdf';
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
      setDriveUrl('');
      setDriveFileName('');
      onClose();
    } catch (err: unknown) {
      setIsUploading(false);
      toast.error(getApiErrorMessage(err, 'Error al guardar la publicación'));
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="w-full max-w-xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-foreground">Publicar en Aula Virtual</h2>
            <p className="text-xs text-muted-foreground">{courseTitle}</p>
          </div>
          <Button variant="ghost" size="icon" aria-label="Cerrar modal" onClick={onClose} className="rounded-full">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 overflow-y-auto space-y-4 text-xs">
          <PublishContentTypeAndFields
            currentType={currentType}
            currentBimester={currentBimester}
            periods={periods}
            periodLabel={periodLabel}
            register={register}
            errors={errors}
            onSelectType={(type) => setValue('contentType', type)}
            onSelectBimester={(bim) => setValue('bimester', bim)}
          />

          {currentType !== 'FORUM' && (
            <PublishAttachmentSection
              attachmentMode={attachmentMode}
              selectedFile={selectedFile}
              driveUrl={driveUrl}
              driveFileName={driveFileName}
              onSetAttachmentMode={setAttachmentMode}
              onSelectFile={setSelectedFile}
              onDriveUrlChange={setDriveUrl}
              onDriveFileNameChange={setDriveFileName}
              onFileChange={handleFileChange}
            />
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
