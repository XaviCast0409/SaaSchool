import { getApiErrorMessage } from '@/lib/errors';
import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Lock, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/axios';

export const ResetPasswordPage: React.FC = () => {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError('El enlace de restablecimiento es inválido o no incluye el token.');
      return;
    }

    if (newPassword.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas ingresadas no coinciden.');
      return;
    }

    setIsPending(true);
    try {
      await api.post('/auth/reset-password', {
        token,
        newPassword,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'El enlace no es válido o ya venció. Solicita uno nuevo.'));
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-muted/40">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-lg space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Lock className="h-6 w-6" aria-hidden />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Restablecer Contraseña</h1>
          <p className="text-xs text-muted-foreground">Ingresa tu nueva contraseña para acceder a la plataforma.</p>
        </div>

        {success ? (
          <div className="space-y-4 text-center">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-2">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              <p className="text-sm font-semibold text-foreground">¡Contraseña actualizada!</p>
              <p className="text-xs text-muted-foreground">
                Tu contraseña ha sido actualizada exitosamente. Ya puedes iniciar sesión con tu nueva clave.
              </p>
            </div>
            <Button asChild className="w-full h-10 font-bold">
              <Link to="/login">Iniciar sesión ahora</Link>
            </Button>
          </div>
        ) : !token ? (
          <div className="space-y-4 text-center">
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 space-y-2 text-destructive">
              <AlertCircle className="mx-auto h-8 w-8" />
              <p className="text-sm font-semibold">Enlace inválido</p>
              <p className="text-xs">
                No se encontró el token de seguridad. Asegúrate de hacer clic en el enlace completo que recibiste por
                correo.
              </p>
            </div>
            <Button asChild variant="outline" className="w-full h-10 font-bold">
              <Link to="/olvide-contrasena">Solicitar nuevo enlace</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="reset-new-password"
                className="text-xs font-semibold text-foreground tracking-wide uppercase"
              >
                Nueva Contraseña
              </label>
              <Input
                id="reset-new-password"
                type="password"
                required
                placeholder="Mínimo 8 caracteres"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-10 text-sm"
              />
              <p className="text-[11px] text-muted-foreground">
                Debe incluir al menos una mayúscula, una minúscula y un número.
              </p>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="reset-confirm-password"
                className="text-xs font-semibold text-foreground tracking-wide uppercase"
              >
                Confirmar Contraseña
              </label>
              <Input
                id="reset-confirm-password"
                type="password"
                required
                placeholder="Repite la nueva contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-10 text-sm"
              />
            </div>

            <Button
              type="submit"
              disabled={isPending || !newPassword || !confirmPassword}
              className="w-full h-10 font-bold gap-2"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Guardar nueva contraseña
            </Button>

            <div className="pt-2 border-t border-border text-center">
              <Link to="/login" className="text-xs text-muted-foreground hover:text-foreground">
                Cancelar y volver al inicio
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
