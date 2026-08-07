import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, Save } from 'lucide-react';
import { toast } from 'sonner';
import { updateUserSchema, type UpdateUserFormData } from '../schemas/user.schema';
import { useUpdateUser } from '../api/useUserMutations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { DirectoryUser } from '../types';

interface EditUserModalProps {
  user: DirectoryUser | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EditUserModal: React.FC<EditUserModalProps> = ({ user, isOpen, onClose }) => {
  const { mutate: updateUser, isPending, error } = useUpdateUser();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateUserFormData>({
    resolver: zodResolver(updateUserSchema),
  });

  useEffect(() => {
    if (user) {
      reset({
        firstName: user.firstName,
        lastNamePaternal: user.lastNamePaternal,
        lastNameMaternal: user.lastNameMaternal,
        email: user.email,
        documentType: user.documentType as any,
        documentId: user.documentId || '',
        cellphone: user.cellphone || '',
        role: user.role,
      });
    }
  }, [user, reset]);

  if (!isOpen || !user) return null;

  const onSubmit = (data: UpdateUserFormData) => {
    updateUser(
      { id: user.id, data },
      {
        onSuccess: () => {
          toast.success(`✅ Usuario ${data.firstName} ${data.lastNamePaternal} actualizado correctamente.`);
          onClose();
        },
        onError: (err: any) => {
          toast.error(err?.response?.data?.message || 'Error al actualizar usuario.');
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-5 sticky top-0 bg-card z-10">
          <div>
            <h2 className="font-bold text-lg text-foreground">Editar Usuario de la Institución</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Modifica los datos personales y datos de contacto del usuario.
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
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-xs font-medium border border-destructive/20">
              {(error as any)?.response?.data?.message || 'Error al actualizar el usuario.'}
            </div>
          )}

          {/* Role */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Rol del Usuario *</label>
            <select
              {...register('role')}
              className="flex h-9 w-full rounded-md border border-border bg-background px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <option value="TEACHER">Profesor(a)</option>
              <option value="PARENT">Apoderado / Padre de Familia</option>
              <option value="SCHOOL_ADMIN">Administrador del Colegio</option>
            </select>
          </div>

          {/* Nombres y Apellidos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Nombre(s) *</label>
              <Input placeholder="Ej: Luis Alberto" {...register('firstName')} className="h-9 text-xs" />
              {errors.firstName && <p className="text-[10px] text-destructive">{errors.firstName.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Apellido Paterno *</label>
              <Input placeholder="Ej: García" {...register('lastNamePaternal')} className="h-9 text-xs" />
              {errors.lastNamePaternal && <p className="text-[10px] text-destructive">{errors.lastNamePaternal.message}</p>}
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-medium text-foreground">Apellido Materno *</label>
              <Input placeholder="Ej: Torres" {...register('lastNameMaternal')} className="h-9 text-xs" />
              {errors.lastNameMaternal && <p className="text-[10px] text-destructive">{errors.lastNameMaternal.message}</p>}
            </div>
          </div>

          {/* Documento */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Tipo Doc.</label>
              <select
                {...register('documentType')}
                className="flex h-9 w-full rounded-md border border-border bg-background px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <option value="DNI">DNI</option>
                <option value="CE">CE</option>
                <option value="PASSPORT">Pasaporte</option>
                <option value="OTHER">Otro</option>
              </select>
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-xs font-medium text-foreground">N° Documento</label>
              <Input placeholder="Ej: 47812345" {...register('documentId')} className="h-9 text-xs" />
            </div>
          </div>

          {/* Contacto */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Correo Electrónico *</label>
              <Input type="email" placeholder="correo@ejemplo.com" {...register('email')} className="h-9 text-xs" />
              {errors.email && <p className="text-[10px] text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Celular</label>
              <Input placeholder="Ej: 987654321" {...register('cellphone')} className="h-9 text-xs font-mono" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
              Cancelar
            </Button>
            <Button type="submit" size="sm" isLoading={isPending} className="gap-2 text-xs">
              <Save className="w-4 h-4" />
              <span>Actualizar Datos</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
