import React from 'react';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import type { CreateUserFormData } from '../../schemas/user.schema';

interface UserPersonalDataFieldsProps {
  register: UseFormRegister<CreateUserFormData>;
  errors: FieldErrors<CreateUserFormData>;
  selectedRole: string;
}

export const UserPersonalDataFields: React.FC<UserPersonalDataFieldsProps> = ({
  register,
  errors,
  selectedRole,
}) => {
  return (
    <>
      {/* Nombre y Apellidos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label
            htmlFor="userformmodal-firstName"
            className="text-xs font-semibold uppercase tracking-wide text-foreground"
          >
            Nombre(s) *
          </label>
          <Input id="userformmodal-firstName" placeholder="Ej: Luis Alberto" {...register('firstName')} />
          {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="userformmodal-lastNamePaternal"
            className="text-xs font-semibold uppercase tracking-wide text-foreground"
          >
            Apellido Paterno *
          </label>
          <Input id="userformmodal-lastNamePaternal" placeholder="Ej: García" {...register('lastNamePaternal')} />
          {errors.lastNamePaternal && <p className="text-xs text-destructive">{errors.lastNamePaternal.message}</p>}
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <label
            htmlFor="userformmodal-lastNameMaternal"
            className="text-xs font-semibold uppercase tracking-wide text-foreground"
          >
            Apellido Materno
          </label>
          <Input id="userformmodal-lastNameMaternal" placeholder="Ej: Torres" {...register('lastNameMaternal')} />
          {errors.lastNameMaternal && <p className="text-xs text-destructive">{errors.lastNameMaternal.message}</p>}
        </div>
      </div>

      {/* Documento */}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <label
            htmlFor="userformmodal-documentType"
            className="text-xs font-semibold uppercase tracking-wide text-foreground"
          >
            Tipo Doc.
          </label>
          <select
            id="userformmodal-documentType"
            {...register('documentType')}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="DNI">DNI (8 dígitos)</option>
            <option value="CE">CE (Carné Extranjería)</option>
            <option value="PTP">PTP (Permiso Temporal)</option>
            <option value="PASSPORT">Pasaporte</option>
            <option value="OTHER">Otro</option>
          </select>
        </div>
        <div className="space-y-1.5 col-span-2">
          <label
            htmlFor="userformmodal-documentId"
            className="text-xs font-semibold uppercase tracking-wide text-foreground"
          >
            N° Documento *
          </label>
          <Input id="userformmodal-documentId" placeholder="Ej: 47812345" {...register('documentId')} />
          {errors.documentId && <p className="text-xs text-destructive">{errors.documentId.message}</p>}
        </div>
      </div>

      {/* Contacto */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label
            htmlFor="userformmodal-email"
            className="text-xs font-semibold uppercase tracking-wide text-foreground"
          >
            {selectedRole === 'PARENT' ? 'Correo Electrónico (Opcional)' : 'Correo Electrónico *'}
          </label>
          <Input id="userformmodal-email" type="email" placeholder="correo@ejemplo.com" {...register('email')} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="userformmodal-cellphone"
            className="text-xs font-semibold uppercase tracking-wide text-foreground"
          >
            Celular
          </label>
          <Input id="userformmodal-cellphone" placeholder="Ej: 987654321" {...register('cellphone')} />
        </div>
      </div>
    </>
  );
};
