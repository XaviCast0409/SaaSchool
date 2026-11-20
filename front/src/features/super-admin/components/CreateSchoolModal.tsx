import React from 'react';
import { useForm } from 'react-hook-form';
import { School as SchoolIcon, X, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateSchool } from '../api/useSuperAdmin';
import type { CreateSchoolPayload } from '../types';
import type { School } from '../../schools/types';
import { Button } from '@/components/ui/button';
import { getApiErrorMessage } from '@/lib/errors';
import { CreatedSchoolSuccessView } from './create-school-modal/CreatedSchoolSuccessView';
import { InstitutionDataFields } from './create-school-modal/InstitutionDataFields';
import { AdminCredentialsFields } from './create-school-modal/AdminCredentialsFields';

interface CreateSchoolModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateSchoolModal: React.FC<CreateSchoolModalProps> = ({ isOpen, onClose }) => {
  const { mutate: createSchool, isPending, error } = useCreateSchool();
  const [createdData, setCreatedData] = React.useState<{
    school: School;
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
      ]),
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
      onError: (err: unknown) => {
        const message = getApiErrorMessage(err, 'Error al registrar el colegio cliente.');
        const field = /modular/i.test(message)
          ? 'modularCode'
          : /RUC/i.test(message)
            ? 'documentId'
            : /código del colegio|slug/i.test(message)
              ? 'slug'
              : /correo|email/i.test(message)
                ? 'adminEmail'
                : null;
        if (field) setError(field as keyof CreateSchoolPayload, { type: 'server', message });
        toast.error(message);
      },
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
    >
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

        {/* Pantalla de Éxito o Formulario */}
        {createdData ? (
          <CreatedSchoolSuccessView createdData={createdData} onClose={handleClose} />
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6 overflow-y-auto">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-xs font-semibold border border-destructive/20">
                {getApiErrorMessage(error, 'Error al registrar el colegio.')}
              </div>
            )}

            <InstitutionDataFields register={register} errors={errors} />
            <AdminCredentialsFields register={register} errors={errors} />

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
