import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { GraduationCap, Loader2, ArrowLeftRight, SearchX, ShieldAlert } from 'lucide-react';
import { loginSchema, LoginFormData } from '../schemas/login.schema';
import { useLogin } from '../api/useLogin';
import { loginBackgroundSrc, useSchoolLoginPage } from '../api/useSchoolLoginPage';
import { clearLastSchoolCode, normalizeSchoolCode } from '../lib/lastSchool';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KipuxLogo } from '@/components/brand/KipuxLogo';

const DEFAULT_BRAND = '#4F46E5';

/** Página de ingreso propia de cada colegio: su fondo, logo, color y mensaje. */
export const SchoolLoginPage: React.FC = () => {
  const { code: rawCode = '' } = useParams<{ code: string }>();
  const code = normalizeSchoolCode(rawCode);
  const navigate = useNavigate();
  const { data: page, isLoading, error: pageError } = useSchoolLoginPage(code);
  const { mutate: login, isPending, error } = useLogin();
  const [backgroundFailed, setBackgroundFailed] = useState(false);

  const notFound = (pageError as { response?: { status?: number } } | null)?.response?.status === 404;
  const isSuspended = (pageError as { response?: { status?: number } } | null)?.response?.status === 403;
  const suspensionMessage =
    (pageError as { response?: { data?: { message?: string } } } | null)?.response?.data?.message ||
    'El acceso de tu colegio está suspendido. Comunícate con la dirección o con soporte de KIPUX.';

  useEffect(() => {
    // Un código guardado que ya no existe o está suspendido no debe volver a abrirse solo
    if (notFound || isSuspended) clearLastSchoolCode();
  }, [notFound, isSuspended]);

  useEffect(() => {
    if (page) document.title = `Ingresar · ${page.name}`;
    return () => {
      document.title = 'KIPUX';
    };
  }, [page]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });

  const onSubmit = (data: LoginFormData) => {
    login({ ...data, schoolSlug: code });
  };

  const changeSchool = () => {
    clearLastSchoolCode();
    navigate('/login?cambiar=1');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" aria-label="Cargando" />
      </div>
    );
  }

  if (isSuspended) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm rounded-2xl border border-destructive/40 bg-card p-6 text-center shadow-xl space-y-3">
          <ShieldAlert className="w-10 h-10 mx-auto text-destructive" aria-hidden />
          <h1 className="text-lg font-bold text-foreground">Colegio Suspendido</h1>
          <p className="text-sm text-muted-foreground">{suspensionMessage}</p>
          <Button variant="outline" className="w-full mt-2" onClick={changeSchool}>
            Ingresar otro código
          </Button>
        </div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-xl space-y-3">
          <SearchX className="w-10 h-10 mx-auto text-muted-foreground" aria-hidden />
          <h1 className="text-lg font-bold text-foreground">
            {notFound ? 'No encontramos este colegio' : 'No pudimos cargar la página'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {notFound
              ? `El código «${code}» no corresponde a ningún colegio activo. Verifícalo con tu colegio.`
              : 'Revisa tu conexión e inténtalo de nuevo.'}
          </p>
          <Button className="w-full" onClick={changeSchool}>Ingresar otro código</Button>
        </div>
      </div>
    );
  }

  const brand = page.brandColor || DEFAULT_BRAND;
  const background = backgroundFailed ? null : loginBackgroundSrc(page.backgroundPath);
  const title = page.loginTitle || `Bienvenidos a ${page.name}`;
  const errorMessage =
    (error as { response?: { data?: { message?: string } } } | null)?.response?.data?.message ||
    (error ? 'Credenciales incorrectas o servidor no disponible.' : null);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-900">
      {/* Fondo: la foto del colegio o, si no tiene, un degradado con su color */}
      {background ? (
        <img
          src={background}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setBackgroundFailed(true)}
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{ background: `radial-gradient(circle at 20% 20%, ${brand}cc, transparent 55%), linear-gradient(135deg, ${brand}, #0f172a)` }}
          aria-hidden
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/40 to-black/25 lg:bg-gradient-to-r" aria-hidden />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center gap-8 px-4 py-10 lg:flex-row lg:justify-between lg:gap-12">
        {/* Mensaje del colegio */}
        <section className="w-full max-w-xl text-white text-center lg:text-left space-y-4">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight drop-shadow-sm [text-wrap:balance]">{title}</h1>
          {page.loginMessage && (
            <p className="text-base sm:text-lg text-white/90 whitespace-pre-line drop-shadow-sm">{page.loginMessage}</p>
          )}
        </section>

        {/* Formulario */}
        <section className="w-full max-w-sm rounded-2xl border border-white/20 bg-card/95 p-6 shadow-2xl backdrop-blur-md">
          <div className="mb-5 flex flex-col items-center gap-2 text-center">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
              {page.logoUrl ? (
                <img src={page.logoUrl} alt={`Logo de ${page.name}`} className="h-full w-full object-contain p-1.5" />
              ) : (
                <GraduationCap className="h-8 w-8" style={{ color: brand }} aria-hidden />
              )}
            </div>
            <p className="text-base font-bold text-foreground leading-tight">{page.name}</p>
            <p className="text-xs text-muted-foreground">Ingresa con tu cuenta del colegio</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5" noValidate>
            {errorMessage && (
              <div role="alert" className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold">
                {errorMessage}
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="school-login-user" className="text-xs font-semibold text-foreground tracking-wide uppercase">
                Usuario
              </label>
              <Input
                id="school-login-user"
                type="text"
                autoComplete="username"
                placeholder="Correo, DNI o código de estudiante"
                {...register('email')}
                className="h-10 text-sm"
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label htmlFor="school-login-password" className="text-xs font-semibold text-foreground tracking-wide uppercase">
                  Contraseña
                </label>
                <Link to="/olvide-contrasena" className="text-xs text-primary hover:underline font-medium">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <Input
                id="school-login-password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                {...register('password')}
                className="h-10 text-sm"
              />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            <Button
              type="submit"
              className="w-full h-10 font-bold text-sm text-white shadow-sm hover:opacity-90"
              style={{ backgroundColor: brand }}
              isLoading={isPending}
            >
              Iniciar sesión
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Al ingresar aceptas nuestros{' '}
              <Link to="/terminos" target="_blank" className="text-primary hover:underline font-medium">Términos</Link> y la{' '}
              <Link to="/privacidad" target="_blank" className="text-primary hover:underline font-medium">Política de Privacidad</Link>.
            </p>
          </form>

          <button
            type="button"
            onClick={changeSchool}
            className="mt-4 flex w-full items-center justify-center gap-1.5 border-t border-border/60 pt-3 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden /> ¿No es tu colegio? Cambiar de colegio
          </button>

          <div className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <span>Con la tecnología de</span>
            <KipuxLogo className="h-5" />
          </div>
        </section>
      </div>
    </div>
  );
};
