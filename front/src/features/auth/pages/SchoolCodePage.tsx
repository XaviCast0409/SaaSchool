import React, { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, KeyRound, Loader2 } from 'lucide-react';
import { schoolLoginUrl, shouldUseSchoolSubdomain } from '@/lib/schoolDomain';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { KipuxLogo } from '@/components/brand/KipuxLogo';
import { fetchSchoolLoginPage } from '../api/useSchoolLoginPage';
import { getLastSchoolCode, isSchoolCodeFormat, normalizeSchoolCode } from '../lib/lastSchool';

const PageSpinner: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="w-8 h-8 animate-spin text-primary" aria-label="Cargando" />
  </div>
);

/**
 * Primer paso del ingreso: la persona escribe el código de su colegio y pasa a la
 * página de ingreso propia de ese colegio: su subdominio (innova.kipuxedu.com) en producción,
 * o /c/<código> sin dominio configurado. Si ya ingresó antes desde este navegador,
 * se la lleva directo (salvo que pida cambiar de colegio).
 */
export const SchoolCodePage: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const remembered = params.get('cambiar') === '1' ? null : getLastSchoolCode();
  const redirectToSubdomain = remembered !== null && shouldUseSchoolSubdomain(remembered);

  useEffect(() => {
    if (remembered && redirectToSubdomain) window.location.replace(schoolLoginUrl(remembered));
  }, [remembered, redirectToSubdomain]);

  if (remembered) {
    if (redirectToSubdomain) return <PageSpinner />;
    return <Navigate to={`/c/${remembered}`} replace />;
  }

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = normalizeSchoolCode(code);
    if (!isSchoolCodeFormat(value)) {
      setError('El código tiene solo letras, números y guiones. Pídelo a tu colegio si no lo tienes.');
      return;
    }
    setError(null);
    setChecking(true);
    try {
      await queryClient.fetchQuery({
        queryKey: ['school-login-page', value],
        queryFn: () => fetchSchoolLoginPage(value),
        staleTime: 5 * 60 * 1000,
      });
      if (shouldUseSchoolSubdomain(value)) {
        // Cada colegio tiene su propio subdominio (innova.kipuxedu.com): se cambia de dirección
        // y el botón sigue cargando mientras el navegador abre la nueva página.
        window.location.assign(schoolLoginUrl(value));
        return;
      }
      navigate(`/c/${value}`);
      setChecking(false);
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      setError(
        status === 404
          ? 'No encontramos un colegio con ese código. Verifícalo con tu colegio.'
          : 'No pudimos verificar el código. Revisa tu conexión e inténtalo de nuevo.',
      );
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-primary/10 pointer-events-none" />

      <Card className="w-full max-w-md shadow-xl border-border bg-card relative z-10">
        <CardHeader className="text-center space-y-2 pb-5 border-b border-border/50">
          <div className="flex justify-center pb-2">
            <KipuxLogo className="h-14 sm:h-16" />
          </div>
          <CardTitle className="text-xl font-bold tracking-tight text-foreground">Ingresa a tu colegio</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Escribe el código de tu colegio para ir a su página de ingreso.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-5 space-y-4">
          <form onSubmit={onSubmit} className="space-y-3.5" noValidate>
            <div className="space-y-1">
              <label htmlFor="school-code" className="text-xs font-semibold text-foreground tracking-wide uppercase">
                Código del colegio
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden />
                <Input
                  id="school-code"
                  autoFocus
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="p. ej. innova"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="h-10 pl-9 text-sm lowercase"
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? 'school-code-error' : 'school-code-help'}
                />
              </div>
              {error ? (
                <p id="school-code-error" className="text-xs text-destructive">{error}</p>
              ) : (
                <p id="school-code-help" className="text-xs text-muted-foreground">
                  Tu colegio te lo entrega junto con tus credenciales. También puedes abrir el enlace que te compartió.
                </p>
              )}
            </div>

            <Button type="submit" className="w-full h-10 font-bold text-sm gap-1.5" isLoading={checking} disabled={!code.trim()}>
              Continuar <ArrowRight className="w-4 h-4" aria-hidden />
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground pt-2 border-t border-border/50">
            ¿Administras la plataforma?{' '}
            <Link to="/login/general" className="text-primary hover:underline font-medium">
              Ingreso general
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
