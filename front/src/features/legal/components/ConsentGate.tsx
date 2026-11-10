import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldCheck, LogOut, Loader2 } from 'lucide-react';
import { useLegalStatus, useAcceptLegal, type LegalDocType } from '../api/useLegal';
import { useAuthStore } from '@/store/useAuthStore';

export const ConsentGate: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { data: pending = [], isLoading } = useLegalStatus({
    enabled: Boolean(user && !user.mustChangePassword),
  });
  const acceptMutation = useAcceptLegal();
  const [checkedDocs, setCheckedDocs] = useState<Record<string, boolean>>({});

  if (isLoading || pending.length === 0) {
    return null;
  }

  const handleCheckboxToggle = (type: LegalDocType) => {
    setCheckedDocs((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  const allAccepted = pending.every((p) => checkedDocs[p.type]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!allAccepted) return;
    acceptMutation.mutate(pending.map((p) => p.type));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <Card className="w-full max-w-xl p-6 sm:p-8 bg-card border-border shadow-2xl rounded-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
            Antes de continuar
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Para continuar utilizando SaaSchool, es necesario que revises y aceptes los siguientes términos legales y consentimientos conforme a la Ley N.° 29733 de Protección de Datos Personales.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3 p-4 rounded-xl border border-border bg-muted/20">
            {pending.map((item) => (
              <label
                key={item.type}
                className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/40 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={Boolean(checkedDocs[item.type])}
                  onChange={() => handleCheckboxToggle(item.type)}
                  className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary"
                />
                <span className="text-xs text-foreground leading-relaxed select-none">
                  {item.type === 'PRIVACY_POLICY' && (
                    <>
                      He leído y acepto la{' '}
                      <Link
                        to="/privacidad"
                        target="_blank"
                        className="text-primary font-semibold underline underline-offset-2 hover:text-primary/80"
                      >
                        Política de Privacidad
                      </Link>
                      .
                    </>
                  )}
                  {item.type === 'TERMS' && (
                    <>
                      He leído y acepto los{' '}
                      <Link
                        to="/terminos"
                        target="_blank"
                        className="text-primary font-semibold underline underline-offset-2 hover:text-primary/80"
                      >
                        Términos y Condiciones de Uso
                      </Link>
                      .
                    </>
                  )}
                  {item.type === 'MINOR_DATA_CONSENT' && (
                    <>
                      Como padre, madre o apoderado(a) legal, autorizo de manera previa, libre, expresa, inequívoca e informada al colegio en el que está matriculado(a) mi hijo(a) (responsable del tratamiento) y a SaaSchool (encargado del tratamiento) a tratar los datos personales de mi(s) menor(es) hijo(s), incluidos datos sensibles de salud y discapacidad, con la finalidad de gestionar su matrícula, evaluación, asistencia, comunicación con la familia y pagos, conforme a la{' '}
                      <Link
                        to="/privacidad"
                        target="_blank"
                        className="text-primary font-semibold underline underline-offset-2 hover:text-primary/80"
                      >
                        Política de Privacidad
                      </Link>
                      . Entiendo que los datos se almacenan en servidores ubicados en Estados Unidos (Render Services, Inc. y Google LLC).
                    </>
                  )}
                </span>
              </label>
            ))}
          </div>

          <div className="space-y-2 pt-2">
            <Button
              type="submit"
              disabled={!allAccepted || acceptMutation.isPending}
              className="w-full text-xs font-bold h-10 shadow-md gap-2"
            >
              {acceptMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Registrando aceptación...</span>
                </>
              ) : (
                <span>Aceptar y continuar</span>
              )}
            </Button>

            <button
              type="button"
              onClick={logout}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-muted-foreground hover:text-destructive transition-colors font-medium"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
};
