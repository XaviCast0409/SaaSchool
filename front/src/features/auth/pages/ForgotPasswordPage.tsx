import { getApiErrorMessage } from '@/lib/errors';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, KeyRound, Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/axios';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsPending(true);

    try {
      await api.post('/auth/forgot-password', { email });
      setSubmitted(true);
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'No se pudo procesar la solicitud. Intenta nuevamente.'));
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-muted/40">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-lg space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <KeyRound className="h-6 w-6" aria-hidden />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">¿Olvidaste tu contraseña?</h1>
          <p className="text-xs text-muted-foreground">
            Ingresa el correo registrado con tu cuenta para recibir un enlace de restablecimiento.
          </p>
        </div>

        {submitted ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center space-y-2">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              <p className="text-sm font-semibold text-foreground">Revisa tu correo electrónico</p>
              <p className="text-xs text-muted-foreground">
                Si el correo <strong>{email}</strong> está registrado, te enviamos un enlace para restablecer tu
                contraseña. Revisa también tu bandeja de spam.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-3 text-xs text-muted-foreground text-center">
              Si no tienes correo registrado, pide a tu colegio que restablezca tu contraseña.
            </div>
            <Button asChild className="w-full h-10 font-bold" variant="outline">
              <Link to="/login">Volver al inicio de sesión</Link>
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
              <label htmlFor="forgot-email" className="text-xs font-semibold text-foreground tracking-wide uppercase">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="forgot-email"
                  type="email"
                  required
                  placeholder="tu-correo@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 pl-9 text-sm"
                />
              </div>
            </div>

            <Button type="submit" disabled={isPending || !email} className="w-full h-10 font-bold gap-2">
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Enviar enlace de recuperación
            </Button>

            <div className="rounded-xl border border-border bg-muted/20 p-3 text-xs text-muted-foreground text-center">
              Si no tienes correo registrado, pide a tu colegio que restablezca tu contraseña.
            </div>

            <div className="pt-2 border-t border-border text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Volver al inicio de sesión</span>
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
