import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, Save } from 'lucide-react';
import { createUserSchema, type CreateUserFormData } from '../schemas/user.schema';
import { useCreateUser } from '../api/useCreateUser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface UserFormModalProps {
  defaultRole?: 'TEACHER' | 'PARENT' | 'SCHOOL_ADMIN';
  onClose: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  SCHOOL_ADMIN: 'Administrador',
  TEACHER: 'Profesor(a)',
  PARENT: 'Apoderado / Padre de Familia',
};

export const UserFormModal: React.FC<UserFormModalProps> = ({ defaultRole = 'PARENT', onClose }) => {
  const { mutate: createUser, isPending, error } = useCreateUser();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      role: defaultRole,
      documentType: 'DNI',
    },
  });

  const onSubmit = (data: CreateUserFormData) => {
    createUser(data, { onSuccess: () => onClose() });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-5 sticky top-0 bg-card z-10">
          <div>
            <h2 className="font-semibold text-base text-foreground">Registrar Usuario</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Rol: <strong>{ROLE_LABELS[defaultRole]}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-xs font-medium border border-destructive/20">
              {(error as { response?: { data?: { message?: string } } }).response?.data?.message ||
                'Error al registrar el usuario. Verifica los datos.'}
            </div>
          )}

          {/* Role (readonly, driven by defaultRole) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-foreground">Rol</label>
            <select
              {...register('role')}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="TEACHER">Profesor(a)</option>
              <option value="PARENT">Apoderado / Padre de Familia</option>
              <option value="SCHOOL_ADMIN">Administrador del Colegio</option>
            </select>
          </div>

          {/* Nombre y Apellidos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-foreground">Nombre(s)</label>
              <Input placeholder="Ej: Luis Alberto" {...register('firstName')} />
              {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-foreground">Apellido Paterno</label>
              <Input placeholder="Ej: García" {...register('lastNamePaternal')} />
              {errors.lastNamePaternal && <p className="text-xs text-destructive">{errors.lastNamePaternal.message}</p>}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-foreground">Apellido Materno</label>
              <Input placeholder="Ej: Torres" {...register('lastNameMaternal')} />
              {errors.lastNameMaternal && <p className="text-xs text-destructive">{errors.lastNameMaternal.message}</p>}
            </div>
          </div>

          {/* Documento */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-foreground">Tipo Doc.</label>
              <select
                {...register('documentType')}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="DNI">DNI</option>
                <option value="CE">CE</option>
                <option value="PASSPORT">Pasaporte</option>
                <option value="OTHER">Otro</option>
              </select>
            </div>
            <div className="space-y-1.5 col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-foreground">N° Documento</label>
              <Input placeholder="Ej: 47812345" {...register('documentId')} />
            </div>
          </div>

          {/* Contacto */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-foreground">Correo Electrónico</label>
              <Input type="email" placeholder="correo@ejemplo.com" {...register('email')} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-foreground">Celular</label>
              <Input placeholder="Ej: 987654321" {...register('cellphone')} />
            </div>
          </div>

          {/* Contraseña */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-foreground">Contraseña Inicial</label>
            <Input type="password" placeholder="Mínimo 8 caracteres" {...register('password')} />
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" isLoading={isPending} className="gap-2">
              <Save className="w-4 h-4" />
              <span>Guardar Usuario</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
