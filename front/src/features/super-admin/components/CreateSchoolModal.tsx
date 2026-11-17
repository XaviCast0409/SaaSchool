import React from 'react';
import { schoolLoginUrl } from '@/lib/schoolDomain';
import { useForm } from 'react-hook-form';
import {
  School as SchoolIcon,
  X,
  Save,
  User,
  Key,
  Shield,
  CheckCircle2,
  Copy,
  ExternalLink,
  Link2,
} from 'lucide-react';
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
  const [createdData, setCreatedData] = React.useState<{
    school: any;
    adminEmail?: string;
    adminPassword?: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CreateSchoolPayload>({
    defaultValues: {
      plan: 'BASIC',
      // Sin valores por defecto: un colegio de Surco no debe quedar registrado en el distrito de Lima
      department: '',
      province: '',
      district: '',
    },
  });

  if (!isOpen) return null;

  const handleClose = () => {
    setCreatedData(null);
    reset();
    onClose();
  };

  const onSubmit = (data: CreateSchoolPayload) => {
    const sanitized = Object.fromEntries(
      Object.entries(data).map(([key, val]) => [
        key,
        typeof val === 'string' && val.trim() === ''
          ? undefined
          : typeof val === 'number' && Number.isNaN(val)
          ? undefined
          : val,
      ])
    ) as CreateSchoolPayload;

    createSchool(sanitized, {
      onSuccess: (newSchool) => {
        toast.success(`✨ ¡Colegio "${newSchool.name}" registrado con éxito!`);
        setCreatedData({
          school: newSchool,
          adminEmail: data.adminEmail,
          adminPassword: data.adminPassword,
        });
      },
      onError: (err: any) => {
        const message: string = err?.response?.data?.message || 'Error al registrar el colegio cliente.';
        // Marca el campo responsable para que se vea qué corregir, además del aviso
        const field = /modular/i.test(message) ? 'modularCode' : /RUC/i.test(message) ? 'documentId' : /código del colegio|slug/i.test(message) ? 'slug' : /correo|email/i.test(message) ? 'adminEmail' : null;
        if (field) setError(field as keyof CreateSchoolPayload, { type: 'server', message });
        toast.error(message);
      },
    });
  };

  const copyCredentials = () => {
    if (!createdData) return;
    const loginUrl = schoolLoginUrl(createdData.school.slug);
    const text = [
      `¡Bienvenido a KIPUX!`,
      `Aquí tienes los datos de acceso para tu colegio:`,
      ``,
      `Colegio: ${createdData.school.name}`,
      `Código de colegio: ${createdData.school.slug}`,
      `Enlace de ingreso: ${loginUrl}`,
      `Usuario (Director): ${createdData.adminEmail || '—'}`,
      `Contraseña inicial: ${createdData.adminPassword || '—'}`,
    ].join('\n');

    navigator.clipboard.writeText(text);
    toast.success('Credenciales copiadas al portapapeles.');
  };

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-5 bg-card shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <SchoolIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-foreground leading-none">
                {createdData ? 'Colegio Registrado con Éxito' : 'Dar de Alta Nuevo Colegio Cliente'}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                {createdData
                  ? 'Guarda o comparte las credenciales de acceso para la dirección del colegio.'
                  : 'Registra la institución escolar y crea automáticamente la cuenta para el Director.'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Pantalla de Éxito (P3) */}
        {createdData ? (
          <div className="p-6 space-y-6 overflow-y-auto">
            <div className="flex items-center gap-3 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="w-6 h-6 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="font-bold text-sm">¡Colegio creado exitosamente!</p>
                <p className="text-xs opacity-90 mt-0.5">
                  El colegio <strong>{createdData.school.name}</strong> está listo para operar.
                </p>
              </div>
            </div>

            <div className="space-y-3 p-4 rounded-xl border border-border bg-muted/40">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground">Código del colegio (slug):</span>
                <p className="font-mono font-bold text-sm text-foreground bg-background p-2 rounded-lg border border-border">
                  {createdData.school.slug}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground">Enlace directo de ingreso:</span>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-xs text-primary bg-background p-2 rounded-lg border border-border flex-1 truncate">
                    {schoolLoginUrl(createdData.school.slug)}
                  </p>
                  <a
                    href={schoolLoginUrl(createdData.school.slug)}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="Abrir enlace"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground">Correo del Director:</span>
                  <p className="font-mono text-xs text-foreground bg-background p-2 rounded-lg border border-border">
                    {createdData.adminEmail || '—'}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground">Contraseña Inicial:</span>
                  <p className="font-mono text-xs text-foreground bg-background p-2 rounded-lg border border-border">
                    {createdData.adminPassword || '—'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={copyCredentials}
                className="w-full sm:w-auto gap-2 text-xs font-bold"
              >
                <Copy className="w-4 h-4" />
                Copiar credenciales
              </Button>
              <Button
                type="button"
                onClick={handleClose}
                className="w-full sm:w-auto text-xs font-bold"
              >
                Listo
              </Button>
            </div>
          </div>
        ) : (
          /* Form Body */
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
                  <label htmlFor="createschoolmodal-name" className="text-xs font-semibold text-foreground">Nombre del Colegio *</label>
                  <Input id="createschoolmodal-name" placeholder="Ej: I.E. San José de Cluny" {...register('name', { required: true })} className="h-9 text-xs" />
                  {errors.name && <p className="text-xs text-destructive">El nombre es requerido</p>}
                </div>

                <div className="space-y-1">
                  <label htmlFor="createschoolmodal-documentId" className="text-xs font-semibold text-foreground">RUC (11 dígitos) *</label>
                  <Input id="createschoolmodal-documentId"
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
                  <label htmlFor="createschoolmodal-slug" className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <Link2 className="w-3.5 h-3.5 text-primary" />
                    <span>Código de Ingreso (slug)</span>
                  </label>
                  <Input id="createschoolmodal-slug" placeholder="Ej: san-jose-cluny" {...register('slug')} className="h-9 text-xs font-mono" />
                  <p className="text-[11px] text-muted-foreground">Si lo dejas vacío se genera desde el nombre.</p>
                </div>

                <div className="space-y-1">
                  <label htmlFor="createschoolmodal-modularCode" className="text-xs font-semibold text-foreground">Código Modular (7 dígitos)</label>
                  <Input id="createschoolmodal-modularCode"
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
                  <label htmlFor="createschoolmodal-phone" className="text-xs font-semibold text-foreground">Teléfono / Celular</label>
                  <Input id="createschoolmodal-phone" placeholder="912345678" {...register('phone')} className="h-9 text-xs" />
                </div>
                <div className="space-y-1">
                  <label htmlFor="createschoolmodal-email" className="text-xs font-semibold text-foreground">Email Institucional</label>
                  <Input id="createschoolmodal-email" placeholder="contacto@colegio.edu.pe" type="email" {...register('email')} className="h-9 text-xs" />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="createschoolmodal-address" className="text-xs font-semibold text-foreground">Dirección</label>
                <Input id="createschoolmodal-address" placeholder="Av. Principal 123, Urbanización..." {...register('address')} className="h-9 text-xs" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label htmlFor="createschoolmodal-department" className="text-xs font-semibold text-foreground">Departamento</label>
                  <Input id="createschoolmodal-department" placeholder="LIMA" {...register('department')} className="h-9 text-xs" />
                </div>
                <div className="space-y-1">
                  <label htmlFor="createschoolmodal-province" className="text-xs font-semibold text-foreground">Provincia</label>
                  <Input id="createschoolmodal-province" placeholder="LIMA" {...register('province')} className="h-9 text-xs" />
                </div>
                <div className="space-y-1">
                  <label htmlFor="createschoolmodal-district" className="text-xs font-semibold text-foreground">Distrito</label>
                  <Input id="createschoolmodal-district" placeholder="LIMA" {...register('district')} className="h-9 text-xs" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label htmlFor="createschoolmodal-plan" className="text-xs font-semibold text-foreground">Plan Inicial *</label>
                  <select id="createschoolmodal-plan"
                    {...register('plan')}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-xs font-bold text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="BASIC">Plan BASIC (S/ 300/mes - Fase 1)</option>
                    <option value="PRO">Plan PRO (S/ 350/mes - Fase 2)</option>
                    <option value="ENTERPRISE">Plan ENTERPRISE (S/ 450/mes - Todo Incluido)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label htmlFor="createschoolmodal-planExpiresAt" className="text-xs font-semibold text-foreground">Vigencia del Plan</label>
                  <Input id="createschoolmodal-planExpiresAt" type="date" {...register('planExpiresAt')} className="h-9 text-xs" />
                </div>
                <div className="space-y-1">
                  <label htmlFor="createschoolmodal-monthlyFee" className="text-xs font-semibold text-foreground">Mensualidad Pactada (S/)</label>
                  <Input id="createschoolmodal-monthlyFee"
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

            {/* Sección 2: Credenciales del Director (School Admin) */}
            <div className="space-y-3 pt-2">
              <div className="text-xs font-extrabold uppercase tracking-wider text-primary flex items-center gap-1.5 border-b border-border pb-1">
                <User className="w-4 h-4" />
                <span>2. Administrador Inicial (Director / Encargado)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label htmlFor="createschoolmodal-adminFirstName" className="text-xs font-semibold text-foreground">Nombres *</label>
                  <Input id="createschoolmodal-adminFirstName" placeholder="Ej: Roberto" {...register('adminFirstName', { required: 'Nombres requeridos' })} className="h-9 text-xs" />
                  {errors.adminFirstName && <p className="text-xs text-destructive">{errors.adminFirstName.message}</p>}
                </div>

                <div className="space-y-1">
                  <label htmlFor="createschoolmodal-adminLastNamePaternal" className="text-xs font-semibold text-foreground">Apellido Paterno *</label>
                  <Input id="createschoolmodal-adminLastNamePaternal" placeholder="Ej: Mendoza" {...register('adminLastNamePaternal', { required: 'Apellido paterno requerido' })} className="h-9 text-xs" />
                  {errors.adminLastNamePaternal && <p className="text-xs text-destructive">{errors.adminLastNamePaternal.message}</p>}
                </div>

                <div className="space-y-1">
                  <label htmlFor="createschoolmodal-adminLastNameMaternal" className="text-xs font-semibold text-foreground">Apellido Materno</label>
                  <Input id="createschoolmodal-adminLastNameMaternal" placeholder="Ej: Salazar" {...register('adminLastNameMaternal')} className="h-9 text-xs" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="createschoolmodal-adminDocumentId" className="text-xs font-semibold text-foreground">DNI del Director (8 dígitos) *</label>
                  <Input id="createschoolmodal-adminDocumentId"
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
                  <label htmlFor="createschoolmodal-adminCellphone" className="text-xs font-semibold text-foreground">Celular del Director</label>
                  <Input id="createschoolmodal-adminCellphone" placeholder="987654321" {...register('adminCellphone')} className="h-9 text-xs" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="createschoolmodal-adminEmail" className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <Key className="w-3 h-3 text-primary" />
                    <span>Email de Acceso (Usuario) *</span>
                  </label>
                  <Input id="createschoolmodal-adminEmail" placeholder="director@colegio.edu.pe" type="email" {...register('adminEmail', { required: 'Email de acceso requerido' })} className="h-9 text-xs" />
                  {errors.adminEmail && <p className="text-xs text-destructive">{errors.adminEmail.message}</p>}
                </div>

                <div className="space-y-1">
                  <label htmlFor="createschoolmodal-adminPassword" className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <Shield className="w-3 h-3 text-primary" />
                    <span>Contraseña Inicial *</span>
                  </label>
                  <Input id="createschoolmodal-adminPassword"
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

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
              <Button type="button" variant="ghost" size="sm" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" isLoading={isPending} className="gap-2 font-bold">
                <Save className="w-4 h-4" />
                <span>Dar de Alta Colegio</span>
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
