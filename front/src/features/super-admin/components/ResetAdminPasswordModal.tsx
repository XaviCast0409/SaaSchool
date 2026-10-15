import React, { useState } from 'react';
import { Key, X, Copy, Check, ShieldAlert, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useResetAdminPassword } from '../api/useSuperAdmin';
import { SchoolWithStats } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ResetAdminPasswordModalProps {
  school: SchoolWithStats | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ResetAdminPasswordModal: React.FC<ResetAdminPasswordModalProps> = ({
  school,
  isOpen,
  onClose,
}) => {
  const [customPassword, setCustomPassword] = useState('');
  const [copied, setCopied] = useState(false);
  const [result, setResult] = useState<{
    adminEmail: string;
    newPassword: string;
    adminName: string;
  } | null>(null);

  const { mutate: resetPassword, isPending } = useResetAdminPassword();

  if (!isOpen || !school) return null;

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    resetPassword(
      {
        id: school.id,
        password: customPassword.trim() || undefined,
      },
      {
        onSuccess: (data) => {
          setResult(data);
          toast.success('Clave de Administrador actualizada correctamente.');
        },
        onError: (err: any) => {
          toast.error(
            err?.response?.data?.message || 'Error al restablecer la contraseña del administrador.'
          );
        },
      }
    );
  };

  const handleCopyCredentials = () => {
    if (!result) return;
    const textToCopy = `Hola ${result.adminName},\nAquí tienes tus nuevas credenciales de acceso a SaaSchool para ${school.name}:\n\n🔗 URL: ${window.location.origin}/login\n📧 Usuario: ${result.adminEmail}\n🔑 Contraseña temporal: ${result.newPassword}\n\nPor seguridad, te sugerimos cambiar tu contraseña una vez que ingreses.`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    toast.success('Credenciales copiadas al portapapeles.');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleClose = () => {
    setResult(null);
    setCustomPassword('');
    setCopied(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4 bg-card shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-base text-foreground leading-none">
                Restablecer Clave de Director
              </h2>
              <p className="text-xs text-muted-foreground mt-1 truncate max-w-[260px]">
                {school.name}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {!result ? (
            <form onSubmit={handleReset} className="space-y-4">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Soporte Técnico de Acceso</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Esta acción actualizará la contraseña del usuario con rol <strong>Director / Administrador</strong> de este colegio para que pueda ingresar inmediatamente.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wide text-foreground">
                  Nueva Contraseña (Opcional)
                </label>
                <Input
                  type="text"
                  placeholder="Dejar vacío para generar una automática"
                  value={customPassword}
                  onChange={(e) => setCustomPassword(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
                <p className="text-[11px] text-muted-foreground">
                  Si lo dejas vacío, el sistema generará una clave segura como: <code className="bg-muted px-1 rounded">Colegio4821!</code>
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button type="button" variant="ghost" size="sm" onClick={handleClose} disabled={isPending}>
                  Cancelar
                </Button>
                <Button type="submit" size="sm" isLoading={isPending} className="gap-2 font-bold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generar y Restablecer</span>
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 block">
                  🎉 Nueva Credencial Generada
                </span>
                <div className="space-y-1 text-xs text-foreground font-mono">
                  <div>
                    <span className="text-muted-foreground">Director:</span> <strong>{result.adminName}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Usuario/Email:</span> <strong>{result.adminEmail}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Nueva Clave:</span>{' '}
                    <span className="px-2 py-0.5 rounded bg-background border border-border font-bold text-primary select-all">
                      {result.newPassword}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Copia las credenciales y envíalas al director por WhatsApp o correo para que pueda recuperar el control de su colegio.
              </p>

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleCopyCredentials}
                  className="gap-2 text-xs font-bold"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? '¡Copiado!' : 'Copiar Credenciales'}</span>
                </Button>

                <Button type="button" size="sm" onClick={handleClose} className="text-xs">
                  Listo
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
