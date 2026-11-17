import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ShieldCheck, Sparkles } from 'lucide-react';
import { loginSchema, LoginFormData } from '../schemas/login.schema';
import { useLogin } from '../api/useLogin';
import { SchoolChooser, schoolOptionsFromError, type SchoolOption } from '../components/SchoolChooser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { KipuxLogo } from '@/components/brand/KipuxLogo';

interface DemoAccount {
  label: string;
  email: string;
  pass: string;
  sub: string;
  badge: string;
  badgeColor?: string;
}

/**
 * Cuentas del seed solo en desarrollo (`pnpm dev`). En el build de producción la condición es
 * falsa en tiempo de compilación y estos usuarios y claves no llegan al navegador.
 */
const SHOW_DEMO_ACCOUNTS = import.meta.env.DEV;

const DEMO_CATEGORIES: Record<string, { title: string; accounts: DemoAccount[] }> = !SHOW_DEMO_ACCOUNTS ? {} : {
  PRO: {
    title: 'Colegio PRO (Innova)',
    accounts: [
      { label: 'Director PRO', email: 'admin.pro@innova.edu.pe', pass: 'Admin123!', sub: 'Gestión y Supervisión', badge: 'PRO', badgeColor: 'bg-primary text-primary-foreground' },
      { label: 'Secretaría PRO', email: 'secretaria.pro@innova.edu.pe', pass: 'Admin123!', sub: 'Matrículas y Caja', badge: 'PRO', badgeColor: 'bg-primary text-primary-foreground' },
      { label: 'Docente PRO', email: 'docente.pro@innova.edu.pe', pass: 'Teacher123!', sub: 'Aula Virtual y Notas', badge: 'PRO', badgeColor: 'bg-primary text-primary-foreground' },
      { label: 'Padre (2 Hijos)', email: 'padre.doshijos@innova.edu.pe', pass: 'Parent123!', sub: 'Lucas (3° Prim) y Valeria (2° Sec)', badge: '2 HIJOS', badgeColor: 'bg-emerald-600 text-white' },
      { label: 'Padre (1 Hijo)', email: 'padre.unhijo@innova.edu.pe', pass: 'Parent123!', sub: 'Gabriel (1° Primaria)', badge: '1 HIJO', badgeColor: 'bg-emerald-600 text-white' },
    ],
  },
  ESTUDIANTES: {
    title: 'Hijos (Estudiantes)',
    accounts: [
      { label: 'Lucas Silva', email: 'alumno.lucas@innova.edu.pe', pass: 'Student123!', sub: '3° Primaria PRO (Mochila Digital)', badge: 'ALUMNO', badgeColor: 'bg-indigo-600 text-white' },
      { label: 'Valeria Silva', email: 'alumno.valeria@innova.edu.pe', pass: 'Student123!', sub: '2° Secundaria PRO (Notas y Cursos)', badge: 'ALUMNA', badgeColor: 'bg-purple-600 text-white' },
      { label: 'Gabriel Mendoza', email: 'alumno.gabriel@innova.edu.pe', pass: 'Student123!', sub: '1° Primaria PRO (Hijo Único)', badge: 'ALUMNO', badgeColor: 'bg-indigo-600 text-white' },
    ],
  },
};

export const LoginPage: React.FC = () => {
  const { mutate: login, isPending, error } = useLogin();
  const [activeCategory, setActiveCategory] = useState<keyof typeof DEMO_CATEGORIES>('PRO');
  const [suspensionNotice, setSuspensionNotice] = useState<string | null>(() => sessionStorage.getItem('suspension_message'));
  // Verificación en dos pasos (cuentas de soporte): el servidor la pide tras validar la contraseña
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState('');
  // La misma persona tiene cuenta en varios colegios: elige a cuál entrar
  const [schoolOptions, setSchoolOptions] = useState<SchoolOption[] | null>(null);
  const [pendingPick, setPendingPick] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    clearErrors,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: SHOW_DEMO_ACCOUNTS
      ? { email: 'admin.pro@innova.edu.pe', password: 'Admin123!' }
      : { email: '', password: '' },
  });

  const submitLogin = (data: LoginFormData, pick?: SchoolOption) => {
    sessionStorage.removeItem('suspension_message');
    setSuspensionNotice(null);
    login(
      {
        ...data,
        ...(otpStep && otp ? { otp } : {}),
        ...(pick ? { schoolId: pick.schoolId, accountType: pick.accountType } : {}),
      },
      {
        onError: (e) => {
          setPendingPick(null);
          const options = schoolOptionsFromError(e);
          if (options) {
            setSchoolOptions(options);
            return;
          }
          const code = (e as { response?: { data?: { code?: string } } }).response?.data?.code;
          if (code === 'MFA_REQUIRED' || code === 'MFA_INVALID') {
            setOtpStep(true);
            setOtp('');
          }
        },
      },
    );
  };

  const onSubmit = (data: LoginFormData) => submitLogin(data);

  const pickSchool = (option: SchoolOption) => {
    setPendingPick(`${option.schoolId}|${option.accountType}`);
    submitLogin(getValues(), option);
  };

  const cancelPick = () => {
    setSchoolOptions(null);
    setPendingPick(null);
    setValue('password', '');
  };

  const handleSelectPreset = (email: string, pass: string) => {
    setValue('email', email, { shouldValidate: true });
    setValue('password', pass, { shouldValidate: true });
    clearErrors();
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background Subtle Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-primary/10 pointer-events-none" />

      <Card className="w-full max-w-lg shadow-xl border-border bg-card relative z-10 my-4">
        <CardHeader className="text-center space-y-2 pb-5 border-b border-border/50">
          <CardTitle className="flex justify-center">
            <KipuxLogo className="h-14 sm:h-16" />
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Plataforma de Gestión Escolar Multi-Tenant (MINEDU SIAGIE)
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-5 space-y-4">
          {schoolOptions && (
            <SchoolChooser options={schoolOptions} onPick={pickSchool} onCancel={cancelPick} pendingSchoolId={pendingPick} />
          )}
          <form onSubmit={handleSubmit(onSubmit)} className={schoolOptions ? 'hidden' : 'space-y-3.5'}>
            {suspensionNotice && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs font-semibold">
                {suspensionNotice}
              </div>
            )}
            {error && !suspensionNotice && !schoolOptionsFromError(error) && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold">
                {(error as { response?: { data?: { message?: string } } }).response?.data?.message ||
                  'Credenciales incorrectas o servidor no disponible.'}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground tracking-wide uppercase">
                Usuario (Correo, DNI o código de estudiante)
              </label>
              <Input
                type="text"
                placeholder="Correo, DNI o código de estudiante"
                {...register('email')}
                className="h-9.5 text-sm"
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground tracking-wide uppercase">
                  Contraseña
                </label>
                <Link to="/olvide-contrasena" className="text-xs text-primary hover:underline font-medium">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <Input
                type="password"
                placeholder="Tu contraseña"
                {...register('password')}
                className="h-9.5 text-sm"
              />
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            {otpStep && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground tracking-wide uppercase">
                  Código de verificación
                </label>
                <Input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  maxLength={6}
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="h-9.5 text-sm tracking-[0.4em] text-center font-mono"
                />
                <p className="text-xs text-muted-foreground">Ábrelo en tu app de autenticación (Google o Microsoft Authenticator).</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-10 font-bold text-sm shadow-sm"
              isLoading={isPending}
              disabled={otpStep && otp.length !== 6}
            >
              Iniciar Sesión
            </Button>

            <p className="text-center text-xs text-muted-foreground pt-1">
              Al ingresar aceptas nuestros{' '}
              <Link to="/terminos" target="_blank" className="text-primary hover:underline font-medium">
                Términos
              </Link>{' '}
              y la{' '}
              <Link to="/privacidad" target="_blank" className="text-primary hover:underline font-medium">
                Política de Privacidad
              </Link>
              .
            </p>

            <p className="text-center text-xs text-muted-foreground">
              ¿Eres del colegio?{' '}
              <Link to="/login?cambiar=1" className="text-primary hover:underline font-medium">
                Ingresa con el código de tu colegio
              </Link>
            </p>
          </form>

          {/* Quick Demo Accesses from Seed Data (solo desarrollo) */}
          {SHOW_DEMO_ACCOUNTS && (
          <div className="mt-5 pt-3.5 border-t border-border space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span>Accesos rápidos de prueba (Seed):</span>
              </div>
              <span className="text-xs text-muted-foreground font-medium flex items-center gap-0.5">
                <Sparkles className="w-3 h-3 text-amber-500" />
                Click para rellenar
              </span>
            </div>

            {/* Categorías de Tabs */}
            <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg border border-border text-xs overflow-x-auto">
              {(Object.keys(DEMO_CATEGORIES) as Array<keyof typeof DEMO_CATEGORIES>).map((catKey) => {
                const isActive = activeCategory === catKey;
                return (
                  <button
                    key={catKey}
                    type="button"
                    onClick={() => setActiveCategory(catKey)}
                    className={`flex-1 min-w-[70px] py-1 px-2 text-xs font-bold rounded-md transition-all text-center whitespace-nowrap ${
                      isActive
                        ? 'bg-background text-primary shadow-xs border border-border/80'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    {DEMO_CATEGORIES[catKey].title.split(' ')[0]} {catKey === 'ESTUDIANTES' ? 'Hijos' : ''}
                  </button>
                );
              })}
            </div>

            {/* Lista de cuentas en la categoría activa */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
              {DEMO_CATEGORIES[activeCategory].accounts.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleSelectPreset(acc.email, acc.pass)}
                  className="p-2 rounded-lg bg-card hover:bg-muted/70 text-left border border-border transition-all hover:border-primary/40 group relative shadow-2xs"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-xs text-foreground group-hover:text-primary transition-colors truncate">
                      {acc.label}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-xs px-1 py-0 h-4 font-bold shrink-0 ${
                        acc.badgeColor || 'border-border text-muted-foreground'
                      }`}
                    >
                      {acc.badge}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground truncate mt-0.5">{acc.email}</div>
                  <div className="text-xs text-primary/80 font-medium truncate mt-0.5">{acc.sub}</div>
                </button>
              ))}
            </div>
          </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
