import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, LoginFormData } from '../schemas/login.schema';
import { useLogin } from '../api/useLogin';
import { SchoolChooser, schoolOptionsFromError, type SchoolOption } from '../components/SchoolChooser';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { KipuxLogo } from '@/components/brand/KipuxLogo';
import { SHOW_DEMO_ACCOUNTS } from '../constants/demoAccounts';
import { DemoAccountsPanel } from '../components/DemoAccountsPanel';
import { LoginForm } from '../components/LoginForm';

export const LoginPage: React.FC = () => {
  const { mutate: login, isPending, error } = useLogin();
  const [suspensionNotice, setSuspensionNotice] = useState<string | null>(() =>
    sessionStorage.getItem('suspension_message'),
  );
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
            <SchoolChooser
              options={schoolOptions}
              onPick={pickSchool}
              onCancel={cancelPick}
              pendingSchoolId={pendingPick}
            />
          )}
          <LoginForm
            register={register}
            errors={errors}
            onSubmit={handleSubmit(onSubmit)}
            isPending={isPending}
            error={error}
            suspensionNotice={suspensionNotice}
            otpStep={otpStep}
            otp={otp}
            onOtpChange={setOtp}
            className={schoolOptions ? 'hidden' : 'space-y-3.5'}
          />

          <DemoAccountsPanel onSelectPreset={handleSelectPreset} />
        </CardContent>
      </Card>
    </div>
  );
};
