import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ShieldAlert, KeyRound, Loader2 } from 'lucide-react';
import { changePasswordSchema, ChangePasswordFormData } from '../schemas/login.schema';
import { useChangePassword } from '../api/useChangePassword';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export const ChangePasswordModal: React.FC = () => {
  const { user } = useAuthStore();
  const { mutate: changePassword, isPending } = useChangePassword();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  });

  // Solo se renderiza si el usuario activo tiene la bandera mustChangePassword
  if (!user?.mustChangePassword) return null;

  const onSubmit = (data: ChangePasswordFormData) => {
    changePassword({ newPassword: data.newPassword });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border p-6 space-y-6 text-foreground">
        {/* Header con icono de alerta de seguridad */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">
            Primer Ingreso: Cambio de Contraseña
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Hola <strong className="text-foreground">{user.firstName}</strong>. Por seguridad de tu familia, al ser tu primer ingreso con tu número de DNI, debes definir una nueva contraseña personal.
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Nueva Contraseña:
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Mínimo 6 caracteres"
                {...register('newPassword')}
                className="pl-9 h-10 text-sm"
              />
            </div>
            {errors.newPassword && (
              <p className="text-xs text-destructive">{errors.newPassword.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Confirmar Nueva Contraseña:
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Repite tu nueva contraseña"
                {...register('confirmPassword')}
                className="pl-9 h-10 text-sm"
              />
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              className="w-full h-10 gap-2 font-semibold shadow-md"
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <KeyRound className="w-4 h-4" />
              )}
              <span>Guardar Contraseña y Continuar</span>
            </Button>
          </div>
        </form>

        <p className="text-[11px] text-center text-muted-foreground">
          Recuerda guardar tu nueva clave en un lugar seguro.
        </p>
      </div>
    </div>
  );
};
