import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, FileText, Upload, Trash2, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { getPeruToday } from '@/lib/dateUtils';
import { useUploadMaterial } from '@/features/course-contents/api/useCourseContents';
import { useCreateJustification } from '../api/useJustifications';
import type { JustificationReason } from '../types';

const justificationFormSchema = z
  .object({
    dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inicial inválida'),
    dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha final inválida'),
    reason: z.enum(['MEDICAL', 'FAMILY', 'BEREAVEMENT', 'TRANSPORT', 'OTHER'], {
      required_error: 'Selecciona un motivo',
    }),
    description: z
      .string()
      .trim()
      .min(5, 'Describe brevemente el motivo (mínimo 5 caracteres)')
      .max(1000, 'Máximo 1000 caracteres'),
    fileUrl: z.string().nullable().optional(),
    fileName: z.string().nullable().optional(),
  })
  .refine((data) => data.dateFrom <= data.dateTo, {
    message: 'La fecha inicial no puede ser posterior a la fecha final',
    path: ['dateTo'],
  });

type JustificationFormData = z.infer<typeof justificationFormSchema>;

interface JustifyAbsenceModalProps {
  open: boolean;
  onClose: () => void;
  enrollmentId: string;
  studentName: string;
  defaultDate?: string;
}

const REASONS: Array<{ value: JustificationReason; label: string }> = [
  { value: 'MEDICAL', label: 'Salud / cita médica' },
  { value: 'FAMILY', label: 'Motivo familiar' },
  { value: 'BEREAVEMENT', label: 'Duelo' },
  { value: 'TRANSPORT', label: 'Problema de transporte' },
  { value: 'OTHER', label: 'Otro motivo' },
];

export const JustifyAbsenceModal: React.FC<JustifyAbsenceModalProps> = ({
  open,
  onClose,
  enrollmentId,
  studentName,
  defaultDate,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const initialDate = defaultDate || getPeruToday();

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<JustificationFormData>({
    resolver: zodResolver(justificationFormSchema),
    defaultValues: {
      dateFrom: initialDate,
      dateTo: initialDate,
      reason: 'MEDICAL',
      description: '',
      fileUrl: null,
      fileName: null,
    },
  });

  useEffect(() => {
    if (open) {
      const d = defaultDate || getPeruToday();
      reset({
        dateFrom: d,
        dateTo: d,
        reason: 'MEDICAL',
        description: '',
        fileUrl: null,
        fileName: null,
      });
      setSelectedFile(null);
    }
  }, [open, defaultDate, reset]);

  const { mutateAsync: createJustification, isPending: isSaving } = useCreateJustification();
  const uploadMutation = useUploadMaterial();

  if (!open) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      toast.error('El archivo excede el tamaño máximo permitido (15 MB).');
      return;
    }

    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      toast.error('Solo se admiten archivos en formato PDF, JPG o PNG.');
      return;
    }

    setSelectedFile(file);
    setValue('fileName', file.name);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setValue('fileUrl', null);
    setValue('fileName', null);
  };

  const onSubmit = async (data: JustificationFormData) => {
    try {
      let uploadedUrl = data.fileUrl;
      let uploadedName = data.fileName;

      if (selectedFile) {
        setIsUploading(true);
        const uploadResult = await uploadMutation.mutateAsync(selectedFile);
        uploadedUrl = uploadResult.url;
        uploadedName = uploadResult.fileName;
        setIsUploading(false);
      }

      await createJustification({
        enrollmentId,
        dateFrom: data.dateFrom,
        dateTo: data.dateTo,
        reason: data.reason,
        description: data.description.trim(),
        fileUrl: uploadedUrl ?? null,
        fileName: uploadedName ?? null,
      });

      onClose();
    } catch (err: any) {
      setIsUploading(false);
      // error handled by mutation onError
    }
  };

  const currentFileName = watch('fileName') || selectedFile?.name;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4 sm:p-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-base text-foreground leading-none">
                Justificar Inasistencia
              </h2>
              <p className="text-xs text-muted-foreground mt-1 truncate max-w-[280px]">
                {studentName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors"
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {/* Rango de fechas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-foreground block mb-1">
                Desde <span className="text-destructive">*</span>
              </label>
              <input
                type="date"
                {...register('dateFrom')}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {errors.dateFrom && (
                <p className="text-[11px] text-destructive mt-1 font-semibold">
                  {errors.dateFrom.message}
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-foreground block mb-1">
                Hasta <span className="text-destructive">*</span>
              </label>
              <input
                type="date"
                {...register('dateTo')}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {errors.dateTo && (
                <p className="text-[11px] text-destructive mt-1 font-semibold">
                  {errors.dateTo.message}
                </p>
              )}
            </div>
          </div>

          {/* Motivo */}
          <div>
            <label className="text-xs font-bold text-foreground block mb-1">
              Motivo <span className="text-destructive">*</span>
            </label>
            <select
              {...register('reason')}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            {errors.reason && (
              <p className="text-[11px] text-destructive mt-1 font-semibold">
                {errors.reason.message}
              </p>
            )}
          </div>

          {/* Descripción */}
          <div>
            <label className="text-xs font-bold text-foreground block mb-1">
              Descripción / Detalle <span className="text-destructive">*</span>
            </label>
            <textarea
              {...register('description')}
              rows={3}
              placeholder="Explica brevemente la razón de la inasistencia..."
              className="w-full rounded-xl border border-border bg-background p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
            {errors.description && (
              <p className="text-[11px] text-destructive mt-1 font-semibold">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Adjuntar sustento */}
          <div>
            <label className="text-xs font-bold text-foreground block mb-1">
              Adjuntar sustento (opcional)
            </label>
            <p className="text-[11px] text-muted-foreground mb-2">
              Formatos: PDF, JPG o PNG. Máximo 15 MB.
            </p>

            {currentFileName ? (
              <div className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-secondary/50 text-xs">
                <div className="flex items-center gap-2 truncate max-w-[80%]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="font-semibold truncate text-foreground">{currentFileName}</span>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all">
                <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                <span className="text-xs font-bold text-foreground">Seleccionar comprobante o certificado</span>
                <span className="text-[10px] text-muted-foreground mt-0.5">Toca aquí para adjuntar el archivo</span>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Botones de acción */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting || isUploading || isSaving}
              className="rounded-xl text-xs font-bold"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || isUploading || isSaving}
              className="rounded-xl text-xs font-bold gap-1.5"
            >
              {(isSubmitting || isUploading || isSaving) && (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              )}
              <span>{isUploading ? 'Subiendo archivo...' : 'Enviar justificación'}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
