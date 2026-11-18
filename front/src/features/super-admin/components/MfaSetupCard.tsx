import React, { useState } from 'react';
import QRCode from 'qrcode';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/axios';
import { useAuthStore } from '@/store/useAuthStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const apiMessage = (e: unknown, fallback: string) =>
  (e as { response?: { data?: { message?: string } } }).response?.data?.message ?? fallback;

/**
 * Enrolamiento de la verificación en dos pasos (TOTP) de la cuenta de soporte.
 * Se muestra mientras la cuenta no la tenga activa: esta cuenta entra a todos los colegios.
 */
export const MfaSetupCard: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  if (!user || user.role !== 'SUPER_ADMIN' || user.mfaEnabled) return null;

  const start = async () => {
    setBusy(true);
    try {
      const { data } = await api.post<{ data: { secret: string; otpauthUri: string } }>('/auth/mfa/setup');
      setSecret(data.data.secret);
      setQr(await QRCode.toDataURL(data.data.otpauthUri, { margin: 1, width: 200 }));
    } catch (e) {
      // Sesión iniciada antes de esta versión: el MFA ya estaba activo
      if ((e as { response?: { status?: number } }).response?.status === 409) {
        updateUser({ mfaEnabled: true });
        return;
      }
      toast.error(apiMessage(e, 'No se pudo generar el código QR.'));
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    setBusy(true);
    try {
      const { data } = await api.post<{ data: { message: string } }>('/auth/mfa/confirm', { code });
      updateUser({ mfaEnabled: true });
      toast.success(data.data.message);
    } catch (e) {
      toast.error(apiMessage(e, 'No se pudo activar la verificación.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-amber-500/40 bg-amber-50/60 dark:bg-amber-950/20">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-semibold">Activa la verificación en dos pasos</p>
            <p className="text-xs text-muted-foreground">
              Esta cuenta puede entrar a todos los colegios. Con la verificación en dos pasos, una contraseña robada no
              basta para ingresar.
            </p>
          </div>
        </div>

        {!qr ? (
          <Button size="sm" onClick={start} isLoading={busy}>
            <ShieldCheck className="h-4 w-4 mr-1.5" /> Configurar ahora
          </Button>
        ) : (
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <img src={qr} alt="Código QR para la app de autenticación" className="h-40 w-40 rounded bg-white p-1" />
            <div className="space-y-2 text-xs flex-1 min-w-0">
              <p>1. Escanea el código con Google Authenticator, Microsoft Authenticator o similar.</p>
              <p className="break-all text-muted-foreground">
                ¿No puedes escanear? Ingresa esta clave: <span className="font-mono text-foreground">{secret}</span>
              </p>
              <p>2. Escribe el código de 6 dígitos que muestra la app:</p>
              <div className="flex gap-2 max-w-xs">
                <Input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="font-mono tracking-[0.3em] text-center"
                />
                <Button size="sm" onClick={confirm} isLoading={busy} disabled={code.length !== 6}>
                  Activar
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
