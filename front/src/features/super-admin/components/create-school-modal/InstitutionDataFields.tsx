import React from 'react';
import { School as SchoolIcon, Link2 } from 'lucide-react';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import type { CreateSchoolPayload } from '../../types';

interface InstitutionDataFieldsProps {
  register: UseFormRegister<CreateSchoolPayload>;
  errors: FieldErrors<CreateSchoolPayload>;
}

export const InstitutionDataFields: React.FC<InstitutionDataFieldsProps> = ({ register, errors }) => {
  return (
    <div className="space-y-3">
      <div className="text-xs font-extrabold uppercase tracking-wider text-primary flex items-center gap-1.5 border-b border-border pb-1">
        <SchoolIcon className="w-4 h-4" />
        <span>1. Datos de la Institución Escolar</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor="createschoolmodal-name" className="text-xs font-semibold text-foreground">
            Nombre del Colegio *
          </label>
          <Input
            id="createschoolmodal-name"
            placeholder="Ej: I.E. San José de Cluny"
            {...register('name', { required: true })}
            className="h-9 text-xs"
          />
          {errors.name && <p className="text-xs text-destructive">El nombre es requerido</p>}
        </div>

        <div className="space-y-1">
          <label htmlFor="createschoolmodal-documentId" className="text-xs font-semibold text-foreground">
            RUC (11 dígitos) *
          </label>
          <Input
            id="createschoolmodal-documentId"
            placeholder="20123456781"
            maxLength={11}
            {...register('documentId', {
              required: 'El RUC es requerido',
              pattern: {
                value: /^\d{11}$/,
                message: 'El RUC debe tener 11 dígitos numéricos',
              },
            })}
            className="h-9 text-xs font-mono"
          />
          {errors.documentId && <p className="text-xs text-destructive">{errors.documentId.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label
            htmlFor="createschoolmodal-slug"
            className="text-xs font-semibold text-foreground flex items-center gap-1"
          >
            <Link2 className="w-3.5 h-3.5 text-primary" />
            <span>Código de Ingreso (slug)</span>
          </label>
          <Input
            id="createschoolmodal-slug"
            placeholder="Ej: san-jose-cluny"
            {...register('slug')}
            className="h-9 text-xs font-mono"
          />
          <p className="text-[11px] text-muted-foreground">Si lo dejas vacío se genera desde el nombre.</p>
        </div>

        <div className="space-y-1">
          <label htmlFor="createschoolmodal-modularCode" className="text-xs font-semibold text-foreground">
            Código Modular (7 dígitos)
          </label>
          <Input
            id="createschoolmodal-modularCode"
            placeholder="Ej: 1234567"
            maxLength={7}
            {...register('modularCode', {
              pattern: {
                value: /^\d{7}$/,
                message: 'El código modular debe tener 7 dígitos',
              },
            })}
            className="h-9 text-xs font-mono"
          />
          {errors.modularCode && <p className="text-xs text-destructive">{errors.modularCode.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor="createschoolmodal-phone" className="text-xs font-semibold text-foreground">
            Teléfono / Celular
          </label>
          <Input
            id="createschoolmodal-phone"
            placeholder="912345678"
            {...register('phone')}
            className="h-9 text-xs"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="createschoolmodal-email" className="text-xs font-semibold text-foreground">
            Email Institucional
          </label>
          <Input
            id="createschoolmodal-email"
            placeholder="contacto@colegio.edu.pe"
            type="email"
            {...register('email')}
            className="h-9 text-xs"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="createschoolmodal-address" className="text-xs font-semibold text-foreground">
          Dirección
        </label>
        <Input
          id="createschoolmodal-address"
          placeholder="Av. Principal 123, Urbanización..."
          {...register('address')}
          className="h-9 text-xs"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label htmlFor="createschoolmodal-department" className="text-xs font-semibold text-foreground">
            Departamento
          </label>
          <Input
            id="createschoolmodal-department"
            placeholder="LIMA"
            {...register('department')}
            className="h-9 text-xs"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="createschoolmodal-province" className="text-xs font-semibold text-foreground">
            Provincia
          </label>
          <Input
            id="createschoolmodal-province"
            placeholder="LIMA"
            {...register('province')}
            className="h-9 text-xs"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="createschoolmodal-district" className="text-xs font-semibold text-foreground">
            Distrito
          </label>
          <Input
            id="createschoolmodal-district"
            placeholder="LIMA"
            {...register('district')}
            className="h-9 text-xs"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label htmlFor="createschoolmodal-plan" className="text-xs font-semibold text-foreground">
            Plan Inicial *
          </label>
          <select
            id="createschoolmodal-plan"
            {...register('plan')}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-xs font-bold text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="BASIC">Plan BASIC (S/ 300/mes - Fase 1)</option>
            <option value="PRO">Plan PRO (S/ 350/mes - Fase 2)</option>
            <option value="ENTERPRISE">Plan ENTERPRISE (S/ 450/mes - Todo Incluido)</option>
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="createschoolmodal-planExpiresAt" className="text-xs font-semibold text-foreground">
            Vigencia del Plan
          </label>
          <Input
            id="createschoolmodal-planExpiresAt"
            type="date"
            {...register('planExpiresAt')}
            className="h-9 text-xs"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="createschoolmodal-monthlyFee" className="text-xs font-semibold text-foreground">
            Mensualidad Pactada (S/)
          </label>
          <Input
            id="createschoolmodal-monthlyFee"
            type="number"
            step="1"
            min="0"
            placeholder="Precio de lista"
            {...register('monthlyFee', { valueAsNumber: true })}
            className="h-9 text-xs"
          />
          <p className="text-[11px] text-muted-foreground">Vacío = precio de lista del plan.</p>
        </div>
      </div>
    </div>
  );
};
