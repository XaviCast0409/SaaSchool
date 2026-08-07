import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X, School as SchoolIcon, Save, Loader2 } from 'lucide-react';
import { useGetActiveSchool, useUpdateSchool } from '../api/useSchool';
import { toast } from 'sonner';

interface SchoolSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SchoolFormValues {
  name: string;
  logoUrl: string;
  phone: string;
  email: string;
  address: string;
  department: string;
  province: string;
  district: string;
  plan?: 'BASIC' | 'PRO' | 'ENTERPRISE';
}

export const SchoolSettingsModal: React.FC<SchoolSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { data: school, isLoading } = useGetActiveSchool();
  const { mutateAsync: updateSchool, isPending } = useUpdateSchool();

  const { register, handleSubmit, reset, watch } = useForm<SchoolFormValues>();
  const logoUrlValue = watch('logoUrl');

  useEffect(() => {
    if (school) {
      reset({
        name: school.name || '',
        logoUrl: school.logoUrl || '',
        phone: school.phone || '',
        email: school.email || '',
        address: school.address || '',
        department: school.department || '',
        province: school.province || '',
        district: school.district || '',
        plan: school.plan || 'BASIC',
      });
    }
  }, [school, reset]);

  if (!isOpen) return null;

  const onSubmit = async (values: SchoolFormValues) => {
    try {
      const sanitizedPayload = Object.fromEntries(
        Object.entries(values).map(([key, val]) => [key, val?.trim() === '' ? undefined : val])
      );
      await updateSchool(sanitizedPayload);
      toast.success('🏫 Datos y logo de la institución guardados correctamente.');
      onClose();
    } catch (error: any) {
      console.error('Error actualizando datos del colegio:', error);
      toast.error(error?.response?.data?.message || 'Error al guardar los datos del colegio.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <SchoolIcon className="w-5 h-5 text-primary" />
            Ajustes del Colegio Cliente
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
            Cargando configuración...
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
            {/* Previsualización del Logo */}
            <div className="p-4 rounded-xl bg-secondary/30 border border-border flex flex-col items-center gap-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase">
                Logo Institucional (Previsualización)
              </span>
              <div className="w-20 h-20 rounded-2xl bg-card border border-border flex items-center justify-center overflow-hidden shadow-sm">
                {logoUrlValue ? (
                  <img
                    src={logoUrlValue}
                    alt="Logo del colegio"
                    className="w-full h-full object-contain p-1"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <SchoolIcon className="w-10 h-10 text-muted-foreground/40" />
                )}
              </div>

              <div className="w-full">
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  URL del Logo (Cloudinary / HTTPS)
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://res.cloudinary.com/..."
                    {...register('logoUrl')}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Sube el logo desde tu frontend a Cloudinary y pega aquí la URL generada.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                Nombre de la Institución Educativa *
              </label>
              <input
                type="text"
                {...register('name', { required: true })}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                  Teléfono / Celular de Contacto
                </label>
                <input
                  type="text"
                  placeholder="912345678"
                  {...register('phone')}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                  Email Institucional
                </label>
                <input
                  type="email"
                  placeholder="contacto@colegio.edu.pe"
                  {...register('email')}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                Dirección del Colegio
              </label>
              <input
                type="text"
                placeholder="Av. Los Educadores 123"
                {...register('address')}
                className="w-full rounded-xl border border-border bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground uppercase mb-1">
                  Departamento
                </label>
                <input
                  type="text"
                  placeholder="LIMA"
                  {...register('department')}
                  className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground uppercase mb-1">
                  Provincia
                </label>
                <input
                  type="text"
                  placeholder="LIMA"
                  {...register('province')}
                  className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground uppercase mb-1">
                  Distrito
                </label>
                <input
                  type="text"
                  placeholder="MIRAFLORES"
                  {...register('district')}
                  className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Plan de Suscripción Contratado */}
            <div className="p-3 rounded-xl bg-secondary/50 border border-border space-y-1.5">
              <label className="block text-xs font-bold text-foreground uppercase">
                Plan de Suscripción Contratado
              </label>
              <select
                {...register('plan')}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                <option value="BASIC">Plan BASIC (Fase 1 - Directorio, Cobranzas, Asistencia, Comunicados)</option>
                <option value="PRO">Plan PRO (Fase 2 - Fase 1 + Registro de Notas SIAGIE, Libretas)</option>
                <option value="ENTERPRISE">Plan ENTERPRISE (Fase 3 - Todo Incluido + Facturación SUNAT)</option>
              </select>
              <p className="text-[11px] text-muted-foreground">
                Cambiar el plan desbloquea o bloquea los módulos en tiempo real para todos los usuarios de este colegio.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 disabled:opacity-50 transition-all"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Guardar Cambios
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
