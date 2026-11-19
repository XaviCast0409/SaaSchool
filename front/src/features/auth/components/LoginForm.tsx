import React from 'react';
import { Link } from 'react-router-dom';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import type { LoginFormData } from '../schemas/login.schema';
import { schoolOptionsFromError } from '../components/SchoolChooser';
import { getApiErrorMessage } from '@/lib/errors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface LoginFormProps {
  register: UseFormRegister<LoginFormData>;
  errors: FieldErrors<LoginFormData>;
  onSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
  isPending: boolean;
  error: unknown;
  suspensionNotice: string | null;
  otpStep: boolean;
  otp: string;
  onOtpChange: (value: string) => void;
  className?: string;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  register,
  errors,
  onSubmit,
  isPending,
  error,
  suspensionNotice,
  otpStep,
  otp,
  onOtpChange,
  className,
}) => {
  return (
    <form onSubmit={onSubmit} className={className ?? 'space-y-3.5'}>
      {suspensionNotice && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs font-semibold">
          {suspensionNotice}
        </div>
      )}
      {Boolean(error) && !suspensionNotice && !schoolOptionsFromError(error) && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold">
          {getApiErrorMessage(error, 'Credenciales incorrectas o servidor no disponible.')}
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
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-foreground tracking-wide uppercase">Contraseña</label>
          <Link to="/olvide-contrasena" className="text-xs text-primary hover:underline font-medium">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
        <Input type="password" placeholder="Tu contraseña" {...register('password')} className="h-9.5 text-sm" />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
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
            onChange={(e) => onOtpChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="h-9.5 text-sm tracking-[0.4em] text-center font-mono"
          />
          <p className="text-xs text-muted-foreground">
            Ábrelo en tu app de autenticación (Google o Microsoft Authenticator).
          </p>
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
  );
};
