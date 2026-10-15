import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Building2, X, Save, Phone, Mail, MapPin, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { useUpdateSchoolInfo } from '../api/useSuperAdmin';
import { SchoolWithStats } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface EditSchoolInfoModalProps {
  school: SchoolWithStats | null;
  isOpen: boolean;
  onClose: () => void;
}

interface SchoolInfoFormValues {
  name: string;
  documentId: string;
  modularCode: string;
  localCode: string;
  phone: string;
  email: string;
  address: string;
  department: string;
  province: string;
  district: string;
  logoUrl: string;
}

export const EditSchoolInfoModal: React.FC<EditSchoolInfoModalProps> = ({
  school,
  isOpen,
  onClose,
}) => {
  const { mutate: updateSchool, isPending } = useUpdateSchoolInfo();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SchoolInfoFormValues>();

  useEffect(() => {
    if (school) {
      reset({
        name: school.name || '',
        documentId: school.documentId || '',
        modularCode: school.modularCode || '',
        localCode: school.localCode || '',
        phone: school.phone || '',
        email: school.email || '',
        address: school.address || '',
        department: school.department || 'LIMA',
        province: school.province || 'LIMA',
        district: school.district || '',
        logoUrl: school.logoUrl || '',
      });
    }
  }, [school, reset]);

  if (!isOpen || !school) return null;

  const onSubmit = (data: SchoolInfoFormValues) => {
    // Sanitizar cadenas vacías para enviar undefined/null
    const sanitized: Record<string, any> = {};
    Object.entries(data).forEach(([key, val]) => {
      sanitized[key] = typeof val === 'string' && val.trim() === '' ? null : val;
    });

    updateSchool(
      {
        id: school.id,
        data: sanitized as Partial<SchoolWithStats>,
      },
      {
        onSuccess: () => {
          toast.success(`✅ Datos del colegio "${data.name}" actualizados correctamente.`);
          onClose();
        },
        onError: (err: any) => {
          toast.error(
            err?.response?.data?.message || 'Error al actualizar los datos del colegio.'
          );
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-5 bg-card shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-foreground leading-none">
                Editar Datos del Colegio
              </h2>
              <p className="text-xs text-muted-foreground mt-1 truncate max-w-[320px]">
                Actualiza teléfonos, dirección, códigos oficiales y datos de contacto de {school.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5 overflow-y-auto">
          {/* Identificación Oficial */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">
              Identificación Oficial
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-semibold text-foreground">Nombre de la Institución *</label>
                <Input
                  {...register('name', { required: 'El nombre es obligatorio' })}
                  className="h-9 text-xs"
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">RUC (11 dígitos) *</label>
                <Input
                  {...register('documentId', { required: 'El RUC es obligatorio' })}
                  maxLength={11}
                  className="h-9 text-xs font-mono"
                />
                {errors.documentId && <p className="text-xs text-destructive">{errors.documentId.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Código Modular MINEDU</label>
                <Input
                  {...register('modularCode')}
                  placeholder="Ej: 0614990"
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Código de Local MINEDU</label>
                <Input
                  {...register('localCode')}
                  placeholder="Ej: LO1234"
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-primary" />
                  <span>URL del Logotipo (Cloudinary / Web)</span>
                </label>
                <Input
                  {...register('logoUrl')}
                  placeholder="https://res.cloudinary.com/..."
                  className="h-9 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Contacto y Ubicación */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">
              Contacto y Ubicación Geográfica
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-primary" />
                  <span>Teléfono / Celular de Contacto</span>
                </label>
                <Input
                  {...register('phone')}
                  placeholder="Ej: 01-4445566 o 987654321"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-primary" />
                  <span>Email Institucional</span>
                </label>
                <Input
                  type="email"
                  {...register('email')}
                  placeholder="admin@colegio.edu.pe"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  <span>Dirección Física</span>
                </label>
                <Input
                  {...register('address')}
                  placeholder="Ej: Av. La Marina 1200"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Departamento</label>
                <Input {...register('department')} placeholder="LIMA" className="h-9 text-xs" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Provincia</label>
                <Input {...register('province')} placeholder="LIMA" className="h-9 text-xs" />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-semibold text-foreground">Distrito</label>
                <Input {...register('district')} placeholder="SAN MIGUEL" className="h-9 text-xs" />
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" isLoading={isPending} className="gap-2 font-bold">
              <Save className="w-4 h-4" />
              <span>Guardar Cambios</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
