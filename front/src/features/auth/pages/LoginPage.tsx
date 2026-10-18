import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { GraduationCap, ShieldCheck, Sparkles } from 'lucide-react';
import { loginSchema, LoginFormData } from '../schemas/login.schema';
import { useLogin } from '../api/useLogin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface DemoAccount {
  label: string;
  email: string;
  pass: string;
  sub: string;
  badge: string;
  badgeColor?: string;
}

const DEMO_CATEGORIES: Record<string, { title: string; accounts: DemoAccount[] }> = {
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
      { label: 'Mateo Pérez', email: 'alumno.mateo@sanignacio.edu.pe', pass: 'Student123!', sub: '2° Primaria BASIC', badge: 'ALUMNO', badgeColor: 'bg-slate-600 text-white' },
    ],
  },
  BASIC: {
    title: 'Colegio BASIC (San Ignacio)',
    accounts: [
      { label: 'Director BASIC', email: 'admin.basic@sanignacio.edu.pe', pass: 'Admin123!', sub: 'Gestión institucional', badge: 'BASIC' },
      { label: 'Secretaría BASIC', email: 'secretaria.basic@sanignacio.edu.pe', pass: 'Admin123!', sub: 'Control escolar básico', badge: 'BASIC' },
      { label: 'Docente BASIC', email: 'docente.basic@sanignacio.edu.pe', pass: 'Teacher123!', sub: 'Notas 2° Primaria', badge: 'BASIC' },
      { label: 'Padre BASIC', email: 'padre.basic@sanignacio.edu.pe', pass: 'Parent123!', sub: 'Padre de Mateo', badge: 'BASIC' },
    ],
  },
};

export const LoginPage: React.FC = () => {
  const { mutate: login, isPending, error } = useLogin();
  const [activeCategory, setActiveCategory] = useState<keyof typeof DEMO_CATEGORIES>('PRO');

  const {
    register,
    handleSubmit,
    setValue,
    clearErrors,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'admin.pro@innova.edu.pe',
      password: 'Admin123!',
    },
  });

  const onSubmit = (data: LoginFormData) => {
    login(data);
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
          <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-1 shadow-sm">
            <GraduationCap className="w-7 h-7" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground">SaaSchool B2B</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Plataforma de Gestión Escolar Multi-Tenant (MINEDU SIAGIE)
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-5 space-y-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold">
                {(error as { response?: { data?: { message?: string } } }).response?.data?.message ||
                  'Credenciales incorrectas o servidor no disponible.'}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground tracking-wide uppercase">
                Usuario (DNI o Correo Institucional)
              </label>
              <Input
                type="text"
                placeholder="Ingresa tu correo o DNI"
                {...register('email')}
                className="h-9.5 text-sm"
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground tracking-wide uppercase">
                Contraseña
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                {...register('password')}
                className="h-9.5 text-sm"
              />
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-10 font-bold text-sm shadow-sm"
              isLoading={isPending}
            >
              Iniciar Sesión
            </Button>
          </form>

          {/* Quick Demo Accesses from Seed Data */}
          <div className="mt-5 pt-3.5 border-t border-border space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span>Accesos rápidos de prueba (Seed):</span>
              </div>
              <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-0.5">
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
                    className={`flex-1 min-w-[70px] py-1 px-2 text-[11px] font-bold rounded-md transition-all text-center whitespace-nowrap ${
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
                      className={`text-[9px] px-1 py-0 h-4 font-bold shrink-0 ${
                        acc.badgeColor || 'border-border text-muted-foreground'
                      }`}
                    >
                      {acc.badge}
                    </Badge>
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate mt-0.5">{acc.email}</div>
                  <div className="text-[9px] text-primary/80 font-medium truncate mt-0.5">{acc.sub}</div>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
