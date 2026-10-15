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

const editStudentSchema = z
  .object({
    firstNames: z.string().trim().min(2, 'Nombres requeridos'),
    lastNamePaternal: z.string().trim().min(2, 'Apellido paterno requerido'),
    lastNameMaternal: z.string().trim().optional(),
    documentType: z.string().default('DNI'),
    documentId: z.string().trim().min(1, 'Documento de identidad requerido'),
    gender: z.enum(['MALE', 'FEMALE']),
    birthDate: z.string().min(1, 'Fecha de nacimiento requerida'),
    birthCountry: z.string().trim().default('PERÚ'),
    birthUbigeo: z.string().trim().optional(),
    residenceUbigeo: z.string().trim().optional(),
    studentCode: z.string().trim().optional(),
    motherTongue: z.string().default('CASTELLANO'),
    hasDisability: z.boolean().default(false),
    disabilityType: z.string().optional(),
    address: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.documentType === 'DNI') {
      if (!/^\d{8}$/.test(data.documentId.trim())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'El DNI debe tener 8 dígitos numéricos',
          path: ['documentId'],
        });
      }
    }
    if (data.birthUbigeo && data.birthUbigeo.trim().length > 0) {
      if (!/^\d{6}$/.test(data.birthUbigeo.trim())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'El Ubigeo consta de 6 dígitos INEI',
          path: ['birthUbigeo'],
        });
      }
    }
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
      const formattedDate = student.birthDate ? new Date(student.birthDate).toISOString().split('T')[0] : '';
      reset({
        firstNames: student.firstNames,
        lastNamePaternal: student.lastNamePaternal,
        lastNameMaternal: student.lastNameMaternal || '',
        documentType: student.documentType,
        documentId: student.documentId,
        gender: student.gender,
        birthDate: formattedDate,
        birthCountry: student.birthCountry || 'PERÚ',
        birthUbigeo: student.birthUbigeo || '',
        residenceUbigeo: student.residenceUbigeo || '',
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
          lastNameMaternal: data.lastNameMaternal?.trim() || null,
          birthDate: new Date(data.birthDate).toISOString(),
          birthUbigeo: data.birthUbigeo?.trim() || null,
          residenceUbigeo: data.residenceUbigeo?.trim() || null,
          studentCode: data.studentCode?.trim() || null,
          disabilityType: data.hasDisability ? data.disabilityType?.trim() || null : null,
          address: data.address?.trim() || null,
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
              Modifica los datos demográficos y de identificación del estudiante.
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

          {/* Nombres y Apellidos Separados */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground">Primer Apellido (Paterno) *</label>
              <Input {...register('lastNamePaternal')} className="h-9 text-xs" />
              {errors.lastNamePaternal && <span className="text-[10px] text-destructive">{errors.lastNamePaternal.message}</span>}
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Segundo Apellido (Materno)</label>
              <Input {...register('lastNameMaternal')} placeholder="Opcional" className="h-9 text-xs" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-foreground">Nombres Completos *</label>
            <Input {...register('firstNames')} className="h-9 text-xs" />
            {errors.firstNames && <span className="text-[10px] text-destructive">{errors.firstNames.message}</span>}
          </div>

          {/* Documento y Género */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground">Tipo Doc. *</label>
              <select
                {...register('documentType')}
                className="w-full h-9 rounded-md border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="DNI">DNI (8 dígitos)</option>
                <option value="CARNET_EXTRANJERIA">Carné Extranjería (CE)</option>
                <option value="PASSPORT">Pasaporte</option>
                <option value="PNA">Partida Nacimiento</option>
                <option value="CODIGO_TEMPORAL">Cód. Temporal SIAGIE</option>
                <option value="OTHER">Otro</option>
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

          {/* Fecha Nacimiento, País, Código SIAGIE */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground">Fecha Nacimiento *</label>
              <Input type="date" {...register('birthDate')} className="h-9 text-xs" />
              {errors.birthDate && <span className="text-[10px] text-destructive">{errors.birthDate.message}</span>}
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">País de Nacimiento</label>
              <Input {...register('birthCountry')} className="h-9 text-xs" />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Código SIAGIE</label>
              <Input {...register('studentCode')} placeholder="14 dígitos" className="h-9 text-xs font-mono" />
            </div>
          </div>

          {/* Ubigeos INEI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground">Ubigeo Nacimiento (6 dígitos)</label>
              <Input {...register('birthUbigeo')} placeholder="Ej: 150101" maxLength={6} className="h-9 text-xs font-mono" />
              {errors.birthUbigeo && <span className="text-[10px] text-destructive">{errors.birthUbigeo.message}</span>}
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Ubigeo Residencia (6 dígitos)</label>
              <Input {...register('residenceUbigeo')} placeholder="Ej: 150101" maxLength={6} className="h-9 text-xs font-mono" />
            </div>
          </div>

          {/* Dirección y Lengua Materna */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground">Lengua Materna</label>
              <Input {...register('motherTongue')} className="h-9 text-xs" />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Dirección Domiciliaria</label>
              <Input {...register('address')} placeholder="Av, Jr, Mz, Lt, Urb" className="h-9 text-xs" />
            </div>
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
