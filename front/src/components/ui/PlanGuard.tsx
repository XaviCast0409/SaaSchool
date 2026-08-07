import React from 'react';
import { Lock, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import { useGetActiveSchool } from '@/features/schools/api/useSchool';
import { SubscriptionPlan } from '@/features/schools/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface PlanGuardProps {
  minPlan: SubscriptionPlan;
  children: React.ReactNode;
}

const PLAN_HIERARCHY: Record<SubscriptionPlan, number> = {
  BASIC: 1,
  PRO: 2,
  ENTERPRISE: 3,
};

export const PlanGuard: React.FC<PlanGuardProps> = ({ minPlan, children }) => {
  const { data: school } = useGetActiveSchool();
  const currentPlan: SubscriptionPlan = school?.plan || 'BASIC';

  const userPlanLevel = PLAN_HIERARCHY[currentPlan] || 1;
  const requiredPlanLevel = PLAN_HIERARCHY[minPlan] || 1;

  if (userPlanLevel >= requiredPlanLevel) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <Card className="max-w-md w-full border-border bg-card shadow-xl overflow-hidden relative">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

        <CardContent className="p-8 space-y-6 flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-inner">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Requiere Plan {minPlan}</span>
            </div>
            <h2 className="text-xl font-extrabold text-foreground tracking-tight">
              Módulo no disponible en tu plan actual
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              El colegio <strong className="text-foreground">{school?.name || 'Cliente'}</strong> cuenta actualmente con el <strong className="text-primary">Plan {currentPlan}</strong>. Para acceder a esta funcionalidad, solicita la actualización de suscripción.
            </p>
          </div>

          <div className="w-full p-3.5 rounded-xl bg-secondary/50 border border-border text-left space-y-2">
            <div className="text-[11px] font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Beneficios del Plan {minPlan}:</span>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside pl-1">
              <li>Registro de Notas formato oficial SIAGIE / CNEB.</li>
              <li>Generación e impresión de Libretas de Notas.</li>
              <li>Soporte técnico prioritario.</li>
            </ul>
          </div>

          <Button
            className="w-full gap-2 text-xs font-bold"
            onClick={() => {
              window.open('https://wa.me/51900000000?text=Hola,%20deseo%20actualizar%20el%20plan%20de%20mi%20colegio', '_blank');
            }}
          >
            <span>Solicitar Actualización de Plan</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
