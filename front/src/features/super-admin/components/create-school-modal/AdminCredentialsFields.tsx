import React from 'react';
import { User, Key, Shield } from 'lucide-react';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import type { CreateSchoolPayload } from '../../types';

interface AdminCredentialsFieldsProps {
  register: UseFormRegister<CreateSchoolPayload>;
  errors: FieldErrors<CreateSchoolPayload>;
}

export const AdminCredentialsFields: React.FC<AdminCredentialsFieldsProps> = ({ register, errors }) => {
  return (
    <div className="space-y-3 pt-2">
      <div className="text-xs font-extrabold uppercase tracking-wider text-primary flex items-center gap-1.5 border-b border-border pb-1">
        <User className="w-4 h-4" />
        <span>2. Administrador Inicial (Director / Encargado)</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label htmlFor="createschoolmodal-adminFirstName" className="text-xs font-semibold text-foreground">
            Nombres *
          </label>
          <Input
            id="createschoolmodal-adminFirstName"
            placeholder="Ej: Roberto"
            {...register('adminFirstName', { required: 'Nombres requeridos' })}
            className="h-9 text-xs"
          />
          {errors.adminFirstName && <p className="text-xs text-destructive">{errors.adminFirstName.message}</p>}
        </div>

        <div className="space-y-1">
          <label htmlFor="createschoolmodal-adminLastNamePaternal" className="text-xs font-semibold text-foreground">
            Apellido Paterno *
          </label>
          <Input
            id="createschoolmodal-adminLastNamePaternal"
            placeholder="Ej: Mendoza"
            {...register('adminLastNamePaternal', { required: 'Apellido paterno requerido' })}
            className="h-9 text-xs"
          />
          {errors.adminLastNamePaternal && (
            <p className="text-xs text-destructive">{errors.adminLastNamePaternal.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="createschoolmodal-adminLastNameMaternal" className="text-xs font-semibold text-foreground">
            Apellido Materno
          </label>
          <Input
            id="createschoolmodal-adminLastNameMaternal"
            placeholder="Ej: Salazar"
            {...register('adminLastNameMaternal')}
            className="h-9 text-xs"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor="createschoolmodal-adminDocumentId" className="text-xs font-semibold text-foreground">
            DNI del Director (8 dígitos) *
          </label>
          <Input
            id="createschoolmodal-adminDocumentId"
            placeholder="Ej: 45678901"
            maxLength={8}
            {...register('adminDocumentId', {
              required: 'El DNI del director es obligatorio',
              pattern: {
                value: /^\d{8}$/,
                message: 'El DNI debe tener 8 dígitos numéricos',
              },
            })}
            className="h-9 text-xs font-mono"
          />
          {errors.adminDocumentId && <p className="text-xs text-destructive">{errors.adminDocumentId.message}</p>}
        </div>

        <div className="space-y-1">
          <label htmlFor="createschoolmodal-adminCellphone" className="text-xs font-semibold text-foreground">
            Celular del Director
          </label>
          <Input
            id="createschoolmodal-adminCellphone"
            placeholder="987654321"
            {...register('adminCellphone')}
            className="h-9 text-xs"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label
            htmlFor="createschoolmodal-adminEmail"
            className="text-xs font-semibold text-foreground flex items-center gap-1"
          >
            <Key className="w-3 h-3 text-primary" />
            <span>Email de Acceso (Usuario) *</span>
          </label>
          <Input
            id="createschoolmodal-adminEmail"
            placeholder="director@colegio.edu.pe"
            type="email"
            {...register('adminEmail', { required: 'Email de acceso requerido' })}
            className="h-9 text-xs"
          />
          {errors.adminEmail && <p className="text-xs text-destructive">{errors.adminEmail.message}</p>}
        </div>

        <div className="space-y-1">
          <label
            htmlFor="createschoolmodal-adminPassword"
            className="text-xs font-semibold text-foreground flex items-center gap-1"
          >
            <Shield className="w-3 h-3 text-primary" />
            <span>Contraseña Inicial *</span>
          </label>
          <Input
            id="createschoolmodal-adminPassword"
            placeholder="Mín. 8 caracteres, letras y números"
            type="text"
            autoComplete="off"
            {...register('adminPassword', {
              required: 'Contraseña inicial requerida',
              pattern: /^(?=.*[A-Za-z])(?=.*\d).{8,}$/,
            })}
            className="h-9 text-xs font-mono"
          />
          {errors.adminPassword ? (
            <p className="text-xs text-destructive">Mínimo 8 caracteres, con letras y números</p>
          ) : (
            <p className="text-xs text-muted-foreground">Visible para que la copies y se la entregues al director.</p>
          )}
        </div>
      </div>
    </div>
  );
};
