import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, Save } from 'lucide-react';
import { createUserSchema, type CreateUserFormData } from '../schemas/user.schema';
import { useCreateUser } from '../api/useCreateUser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSelectedAcademicYear } from '@/components/AcademicYearSwitcher';
import { useAuthStore } from '@/store/useAuthStore';
import type { DirectoryUser } from '../types';
import { TemporaryCredentialsDialog, type TemporaryCredential } from '@/components/ui/TemporaryCredentialsDialog';
import { getApiErrorMessage } from '@/lib/errors';
import { USER_FORM_ROLE_LABELS } from '../constants';
import { UserPersonalDataFields } from './user-form-modal/UserPersonalDataFields';

interface UserFormModalProps {
  defaultRole?: 'TEACHER' | 'PARENT' | 'SCHOOL_ADMIN' | 'ADMINISTRATIVE';
  onClose: () => void;
  /** Avisa la cuenta recién creada (p. ej. para vincularla en seguida a un alumno) */
  onCreated?: (user: DirectoryUser) => void;
}

export const UserFormModal: React.FC<UserFormModalProps> = ({ defaultRole = 'PARENT', onClose, onCreated }) => {
  const { mutate: createUser, isPending, error } = useCreateUser();
  const [tempCredentials, setTempCredentials] = useState<TemporaryCredential[] | null>(null);
  const currentUser = useAuthStore((s) => s.user);
  const isAdministrative = currentUser?.role === 'ADMINISTRATIVE';
  const effectiveDefaultRole =
    isAdministrative && (defaultRole === 'SCHOOL_ADMIN' || defaultRole === 'ADMINISTRATIVE') ? 'TEACHER' : defaultRole;

  const isParentFlow = defaultRole === 'PARENT';
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      role: effectiveDefaultRole,
      documentType: 'DNI',
    },
  });

  const selectedRole = watch('role');

  const generatePassword = () => {
    const letters = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
    const digits = '23456789';
    const pick = (set: string) => set[crypto.getRandomValues(new Uint32Array(1))[0] % set.length];
    const chars = [
      pick(letters),
      pick(letters),
      pick(digits),
      pick(digits),
      ...Array.from({ length: 6 }, () => pick(letters + digits)),
    ];
    for (let i = chars.length - 1; i > 0; i -= 1) {
      const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    setValue('password', chars.join(''), { shouldValidate: true });
    setShowPassword(true);
  };
  const isStaff = selectedRole !== 'PARENT';

  const { years, current, selected: viewedYear } = useSelectedAcademicYear();
  const hireYears = [...years].filter((y) => !current || y.year >= current.year).sort((a, b) => a.year - b.year);
  const [yearIds, setYearIds] = useState<string[]>(() => (viewedYear ? [viewedYear.id] : []));

  const onSubmit = (data: CreateUserFormData) => {
    createUser(
      { ...data, ...(isStaff && yearIds.length ? { academicYearIds: yearIds } : {}) },
      {
        onSuccess: (createdUser) => {
          onCreated?.(createdUser);
          if (createdUser.temporaryPassword) {
            setTempCredentials([
              {
                name: `${createdUser.firstName} ${createdUser.lastNamePaternal}`,
                login: createdUser.email || createdUser.documentId || '',
                password: createdUser.temporaryPassword,
              },
            ]);
          } else {
            onClose();
          }
        },
      },
    );
  };

  if (tempCredentials) {
    return (
      <TemporaryCredentialsDialog
        open={true}
        onOpenChange={(open) => {
          if (!open) {
            setTempCredentials(null);
            onClose();
          }
        }}
        title="Usuario registrado — Credenciales temporales"
        description="Comparta estas credenciales de forma segura. El usuario deberá cambiar su contraseña en el primer inicio de sesión."
        credentials={tempCredentials}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-form-title"
        className="w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl overflow-y-auto max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-5 sticky top-0 bg-card z-10">
          <div>
            <h2 id="user-form-title" className="font-semibold text-base text-foreground">
              {isParentFlow ? 'Registrar apoderado' : 'Registrar personal'}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Rol: <strong>{USER_FORM_ROLE_LABELS[defaultRole]}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-xs font-medium border border-destructive/20">
              {getApiErrorMessage(error, 'Error al registrar el usuario. Verifica los datos.')}
            </div>
          )}

          {/* Role */}
          <div className="space-y-1.5">
            <label
              htmlFor="userformmodal-role"
              className="text-xs font-semibold uppercase tracking-wide text-foreground"
            >
              Rol
            </label>
            <select
              id="userformmodal-role"
              {...register('role')}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {isParentFlow && <option value="PARENT">Apoderado / Padre de Familia</option>}
              <option value="TEACHER">Profesor(a)</option>
              {!isAdministrative && (
                <>
                  <option value="ADMINISTRATIVE">Personal Administrativo (Secretaría / Caja)</option>
                  <option value="SCHOOL_ADMIN">Director / Promotor (Administrador General)</option>
                </>
              )}
            </select>
          </div>

          <UserPersonalDataFields register={register} errors={errors} selectedRole={selectedRole} />

          {/* Años de contratación (personal) */}
          {isStaff && hireYears.length > 1 && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-foreground">Contratado para</label>
              <div className="flex flex-wrap gap-3 text-sm">
                {hireYears.map((y) => (
                  <label key={y.id} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded"
                      checked={yearIds.includes(y.id)}
                      onChange={(e) =>
                        setYearIds((ids) => (e.target.checked ? [...ids, y.id] : ids.filter((i) => i !== y.id)))
                      }
                    />
                    {y.year}
                    {y.isActive ? ' (vigente)' : ''}
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Si se contrata desde ahora para el año siguiente, marca solo ese año.
              </p>
            </div>
          )}

          {/* Contraseña */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="user-form-password"
                className="text-xs font-semibold uppercase tracking-wide text-foreground"
              >
                Contraseña inicial *
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-xs text-muted-foreground hover:underline"
                >
                  {showPassword ? 'Ocultar' : 'Mostrar'}
                </button>
                <button
                  type="button"
                  onClick={generatePassword}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Generar contraseña
                </button>
              </div>
            </div>
            <Input
              id="user-form-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Mínimo 8 caracteres, con letras y números"
              autoComplete="new-password"
              {...register('password')}
            />
            <p className="text-[11px] text-muted-foreground">
              Entrégasela a la persona: el sistema le pedirá cambiarla en su primer ingreso.
            </p>
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
