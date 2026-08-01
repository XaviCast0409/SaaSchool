import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { GraduationCap, ShieldCheck } from 'lucide-react';
import { loginSchema, LoginFormData } from '../schemas/login.schema';
import { useLogin } from '../api/useLogin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const LoginPage: React.FC = () => {
  const { mutate: login, isPending, error } = useLogin();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'admin@sanignacio.edu.pe',
      password: 'Admin123!',
    },
  });

  const onSubmit = (data: LoginFormData) => {
    login(data);
  };

  const setPresetUser = (email: string) => {
    setValue('email', email);
    setValue('password', email.includes('admin') ? 'Admin123!' : 'Teacher123!');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background Subtle Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-primary/10 pointer-events-none" />

      <Card className="w-full max-w-md shadow-xl border-border bg-card relative z-10">
        <CardHeader className="text-center space-y-2 pb-6 border-b border-border/50">
          <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-1">
            <GraduationCap className="w-7 h-7" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">SaaSchool B2B</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Plataforma de Gestión Escolar Multi-Tenant
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
                {(error as { response?: { data?: { message?: string } } }).response?.data?.message ||
                  'Credenciales incorrectas o error en el servidor.'}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground tracking-wide uppercase">
                Correo Electrónico
              </label>
              <Input
                type="email"
                placeholder="ejemplo@colegio.edu.pe"
                {...register('email')}
                className="h-10"
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground tracking-wide uppercase">
                Contraseña
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                {...register('password')}
                className="h-10"
              />
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-10 font-semibold text-sm shadow-md"
              isLoading={isPending}
            >
              Iniciar Sesión
            </Button>
          </form>

          {/* Quick Demo Accesses from Seed Data */}
          <div className="mt-6 pt-4 border-t border-border space-y-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Accesos rápidos de prueba (Seed):</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setPresetUser('admin@sanignacio.edu.pe')}
                className="p-2 rounded bg-muted/60 hover:bg-muted text-left border border-border transition-colors truncate"
              >
                <div className="font-semibold text-foreground">Admin San Ignacio</div>
                <div className="text-[10px] text-muted-foreground">admin@sanignacio...</div>
              </button>

              <button
                type="button"
                onClick={() => setPresetUser('jmartinez@sanignacio.edu.pe')}
                className="p-2 rounded bg-muted/60 hover:bg-muted text-left border border-border transition-colors truncate"
              >
                <div className="font-semibold text-foreground">Profe Jorge M.</div>
                <div className="text-[10px] text-muted-foreground">jmartinez@sanignacio...</div>
              </button>

              <button
                type="button"
                onClick={() => setPresetUser('admin@santarosa.edu.pe')}
                className="p-2 rounded bg-muted/60 hover:bg-muted text-left border border-border transition-colors truncate"
              >
                <div className="font-semibold text-foreground">Admin Santa Rosa</div>
                <div className="text-[10px] text-muted-foreground">admin@santarosa...</div>
              </button>

              <button
                type="button"
                onClick={() => setPresetUser('rquispe@santarosa.edu.pe')}
                className="p-2 rounded bg-muted/60 hover:bg-muted text-left border border-border transition-colors truncate"
              >
                <div className="font-semibold text-foreground">Profe Ricardo Q.</div>
                <div className="text-[10px] text-muted-foreground">rquispe@santarosa...</div>
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
