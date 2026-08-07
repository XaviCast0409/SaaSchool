import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Save, User } from 'lucide-react';
import { useUpdateStudent } from '../api/useStudents';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Student } from '../types';

const editStudentSchema = z.object({
  firstNames: z.string().min(2, 'Nombres requeridos'),
  lastNamePaternal: z.string().min(2, 'Apellido paterno requerido'),
  lastNameMaternal: z.string().min(2, 'Apellido materno requerido'),
  documentType: z.string().default('DNI'),
  documentId: z.string().min(1, 'Documento de identidad requerido'),
  gender: z.enum(['MALE', 'FEMALE']),
  birthDate: z.string().min(1, 'Fecha de nacimiento requerida'),
  studentCode: z.string().optional(),
  motherTongue: z.string().default('CASTELLANO'),
  hasDisability: z.boolean().default(false),
  disabilityType: z.string().optional(),
  address: z.string().optional(),
});

type EditStudentFormData = z.infer<typeof editStudentSchema>;

interface EditStudentModalProps {
  student: Student | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EditStudentModal: React.FC<EditStudentModalProps> = ({ student, isOpen, onClose }) => {
  const { mutate: updateStudent, isPending, error } = useUpdateStudent();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<EditStudentFormData>({
    resolver: zodResolver(editStudentSchema),
  });

  const hasDisability = watch('hasDisability');

  useEffect(() => {
    if (student) {
      // Format birthDate to YYYY-MM-DD for standard date input
      const formattedDate = student.birthDate ? new Date(student.birthDate).toISOString().split('T')[0] : '';
      reset({
        firstNames: student.firstNames,
        lastNamePaternal: student.lastNamePaternal,
        lastNameMaternal: student.lastNameMaternal,
        documentType: student.documentType,
        documentId: student.documentId,
        gender: student.gender,
        birthDate: formattedDate,
        studentCode: student.studentCode || '',
        motherTongue: student.motherTongue || 'CASTELLANO',
        hasDisability: student.hasDisability || false,
        disabilityType: student.disabilityType || '',
        address: student.address || '',
      });
    }
  }, [student, reset]);

  if (!isOpen || !student) return null;

  const onSubmit = (data: EditStudentFormData) => {
    updateStudent(
      {
        id: student.id,
        payload: {
          ...data,
          birthDate: new Date(data.birthDate).toISOString(),
          studentCode: data.studentCode || undefined,
          disabilityType: data.hasDisability ? data.disabilityType : undefined,
          address: data.address || undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success(`✅ Ficha de ${data.firstNames} ${data.lastNamePaternal} actualizada correctamente.`);
          onClose();
        },
        onError: (err: any) => {
          toast.error(err?.response?.data?.message || 'Error al actualizar estudiante.');
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-xl rounded-2xl border border-border bg-card shadow-2xl overflow-y-auto max-h-[90vh] space-y-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div>
            <h2 className="font-bold text-lg text-foreground flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Editar Ficha de Estudiante (SIAGIE)
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Modifica los datos demográficos del estudiante matriculado.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-xs font-medium border border-destructive/20">
              {(error as any)?.response?.data?.message || 'Error al actualizar el estudiante.'}
            </div>
          )}

          {/* Nombres y Apellidos */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground">Nombres *</label>
              <Input {...register('firstNames')} className="h-9 text-xs" />
              {errors.firstNames && <span className="text-[10px] text-destructive">{errors.firstNames.message}</span>}
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Apellido Paterno *</label>
              <Input {...register('lastNamePaternal')} className="h-9 text-xs" />
              {errors.lastNamePaternal && <span className="text-[10px] text-destructive">{errors.lastNamePaternal.message}</span>}
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Apellido Materno *</label>
              <Input {...register('lastNameMaternal')} className="h-9 text-xs" />
              {errors.lastNameMaternal && <span className="text-[10px] text-destructive">{errors.lastNameMaternal.message}</span>}
            </div>
          </div>

          {/* Documento y Género */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground">Tipo Doc. *</label>
              <select
                {...register('documentType')}
                className="w-full h-9 rounded-md border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="DNI">DNI</option>
                <option value="CE">Carnet de Extranjería</option>
                <option value="PASSPORT">Pasaporte</option>
                <option value="PNA">PNA (Partida Nacimiento)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Número de Doc. *</label>
              <Input {...register('documentId')} className="h-9 text-xs font-mono" />
              {errors.documentId && <span className="text-[10px] text-destructive">{errors.documentId.message}</span>}
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Género *</label>
              <select
                {...register('gender')}
                className="w-full h-9 rounded-md border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="MALE">Masculino</option>
                <option value="FEMALE">Femenino</option>
              </select>
            </div>
          </div>

          {/* Fecha Nacimiento, SIAGIE, Lengua Materna */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground">Fecha Nacimiento *</label>
              <Input type="date" {...register('birthDate')} className="h-9 text-xs" />
              {errors.birthDate && <span className="text-[10px] text-destructive">{errors.birthDate.message}</span>}
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Código SIAGIE</label>
              <Input {...register('studentCode')} className="h-9 text-xs font-mono" />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Lengua Materna</label>
              <Input {...register('motherTongue')} className="h-9 text-xs" />
            </div>
          </div>

          {/* Dirección */}
          <div>
            <label className="text-xs font-medium text-foreground">Dirección de Residencia</label>
            <Input {...register('address')} placeholder="Ej. Av. Larco 123, Miraflores" className="h-9 text-xs" />
          </div>

          {/* NEE / Discapacidad */}
          <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer">
              <input
                type="checkbox"
                {...register('hasDisability')}
                className="rounded border-border text-primary focus:ring-primary h-4 w-4"
              />
              <span>¿Tiene Discapacidad / Necesidad Educativa Especial (NEE)?</span>
            </label>

            {hasDisability && (
              <div>
                <label className="text-xs font-medium text-foreground">Detalle / Tipo de Discapacidad</label>
                <Input {...register('disabilityType')} placeholder="Ej. Visual, Motora, TEA..." className="h-9 text-xs" />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
              Cancelar
            </Button>
            <Button type="submit" size="sm" isLoading={isPending} className="gap-2 text-xs">
              <Save className="w-4 h-4" />
              <span>Guardar Cambios</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
