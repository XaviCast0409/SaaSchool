import React from 'react';
import { useForm } from 'react-hook-form';
import { School as SchoolIcon, X, Save, User, Key, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateSchool } from '../api/useSuperAdmin';
import { CreateSchoolPayload } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface CreateSchoolModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateSchoolModal: React.FC<CreateSchoolModalProps> = ({ isOpen, onClose }) => {
  const { mutate: createSchool, isPending, error } = useCreateSchool();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateSchoolPayload>({
    defaultValues: {
      plan: 'BASIC',
      department: 'LIMA',
      province: 'LIMA',
    },
  });

  if (!isOpen) return null;

  const onSubmit = (data: CreateSchoolPayload) => {
    const sanitized = Object.fromEntries(
      Object.entries(data).map(([key, val]) => [key, typeof val === 'string' && val.trim() === '' ? undefined : val])
    ) as CreateSchoolPayload;

    createSchool(sanitized, {
      onSuccess: (newSchool) => {
        toast.success(`✨ ¡Colegio "${newSchool.name}" registrado con éxito! Cuenta de Administrador creada.`);
        reset();
        onClose();
      },
      onError: (err: any) => {
        toast.error(err?.response?.data?.message || 'Error al registrar el colegio cliente.');
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-5 bg-card shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <SchoolIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-foreground leading-none">
                Dar de Alta Nuevo Colegio Cliente
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Registra la institución escolar y crea automáticamente la cuenta para el Director.
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
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6 overflow-y-auto">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-xs font-semibold border border-destructive/20">
              {(error as any)?.response?.data?.message || 'Error al registrar el colegio.'}
            </div>
          )}

          {/* Sección 1: Datos de la Institución */}
          <div className="space-y-3">
            <div className="text-xs font-extrabold uppercase tracking-wider text-primary flex items-center gap-1.5 border-b border-border pb-1">
              <SchoolIcon className="w-4 h-4" />
              <span>1. Datos de la Institución Escolar</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Nombre del Colegio *</label>
                <Input placeholder="Ej: I.E. San José de Cluny" {...register('name', { required: true })} className="h-9 text-xs" />
                {errors.name && <p className="text-xs text-destructive">El nombre es requerido</p>}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">RUC (11 dígitos) *</label>
                <Input placeholder="20123456781" maxLength={11} {...register('documentId', { required: true })} className="h-9 text-xs font-mono" />
                {errors.documentId && <p className="text-xs text-destructive">RUC requerido</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Teléfono / Celular</label>
                <Input placeholder="912345678" {...register('phone')} className="h-9 text-xs" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Email Institucional</label>
                <Input placeholder="contacto@colegio.edu.pe" type="email" {...register('email')} className="h-9 text-xs" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Plan Inicial *</label>
                <select
                  {...register('plan')}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-xs font-bold text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="BASIC">Plan BASIC (S/ 400/mes - Fase 1)</option>
                  <option value="PRO">Plan PRO (S/ 650/mes - Fase 2)</option>
                  <option value="ENTERPRISE">Plan ENTERPRISE (S/ 1,200/mes - Todo Incluido)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Sección 2: Credenciales del Director (School Admin) */}
          <div className="space-y-3 pt-2">
            <div className="text-xs font-extrabold uppercase tracking-wider text-primary flex items-center gap-1.5 border-b border-border pb-1">
              <User className="w-4 h-4" />
              <span>2. Administrador Inicial (Director / Encargado)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Nombres *</label>
                <Input placeholder="Ej: Roberto" {...register('adminFirstName', { required: true })} className="h-9 text-xs" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Apellido Paterno *</label>
                <Input placeholder="Ej: Mendoza" {...register('adminLastNamePaternal', { required: true })} className="h-9 text-xs" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <Key className="w-3 h-3 text-primary" />
                  <span>Email de Acceso (Usuario) *</span>
                </label>
                <Input placeholder="director@colegio.edu.pe" type="email" {...register('adminEmail', { required: true })} className="h-9 text-xs" />
                {errors.adminEmail && <p className="text-xs text-destructive">Email de acceso requerido</p>}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <Shield className="w-3 h-3 text-primary" />
                  <span>Contraseña Inicial *</span>
                </label>
                <Input placeholder="Contraseña segura" type="password" {...register('adminPassword', { required: true, minLength: 6 })} className="h-9 text-xs font-mono" />
                {errors.adminPassword && <p className="text-xs text-destructive">Mínimo 6 caracteres</p>}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" isLoading={isPending} className="gap-2 font-bold">
              <Save className="w-4 h-4" />
              <span>Dar de Alta Colegio</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
