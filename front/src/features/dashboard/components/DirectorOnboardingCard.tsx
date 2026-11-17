import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { OnboardingStatus } from '@/features/super-admin/api/usePlatform';

interface DirectorOnboardingCardProps {
  onboarding: OnboardingStatus;
  onOpenSettings: () => void;
}

export const DirectorOnboardingCard: React.FC<DirectorOnboardingCardProps> = ({
  onboarding,
  onOpenSettings,
}) => {
  const navigate = useNavigate();

  const handleNextAction = (stepKey: string) => {
    switch (stepKey) {
      case 'profile':
        onOpenSettings();
        break;
      case 'academic-year':
        navigate('/academic-years');
        break;
      case 'classrooms':
        navigate('/classrooms');
        break;
      case 'teachers':
        navigate('/directory');
        break;
      case 'students':
      case 'families':
        navigate('/students');
        break;
      case 'courses':
        navigate('/academic/teaching-load');
        break;
      case 'fee-schedule':
        navigate('/payments/fee-schedules');
        break;
      case 'payments':
        navigate('/payments/fee-schedules');
        break;
      case 'attendance':
        navigate('/attendance');
        break;
      default:
        break;
    }
  };

  return (
    <Card className="p-5 sm:p-6 border-primary/30 bg-card shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Guía de Inicio</span>
          </div>
          <h2 className="text-lg font-extrabold text-foreground tracking-tight mt-0.5">
            Pon en marcha tu colegio
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Completa estos pasos esenciales para que tus docentes, apoderados y estudiantes puedan empezar.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-extrabold text-foreground">
            {onboarding.completed} de {onboarding.total} completados
          </span>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
            {onboarding.percent}%
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div
        className="w-full h-2.5 rounded-full bg-secondary overflow-hidden"
        role="progressbar"
        aria-valuenow={onboarding.percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${onboarding.percent}%` }}
        />
      </div>

      {/* Next Step Call to Action */}
      {onboarding.nextStep && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-primary/20 bg-primary/5">
          <div className="text-xs">
            <span className="text-muted-foreground block">Paso recomendado ahora:</span>
            <span className="font-bold text-foreground text-sm">{onboarding.nextStep.label}</span>
          </div>
          <Button
            size="sm"
            onClick={() => handleNextAction(onboarding.nextStep!.key)}
            className="gap-1.5 text-xs font-bold shrink-0"
          >
            <span>Ir al siguiente paso</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {/* Steps List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-border/60">
        {onboarding.steps.map((step) => (
          <div
            key={step.key}
            className={`flex items-center justify-between p-2 rounded-lg text-xs ${
              step.done ? 'text-muted-foreground' : 'text-foreground font-semibold bg-muted/40'
            }`}
          >
            <div className="flex items-center gap-2">
              {step.done ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-muted-foreground shrink-0" />
              )}
              <span>{step.label}</span>
              {step.detail && <span className="text-[11px] text-muted-foreground">({step.detail})</span>}
            </div>
            {!step.done && (
              <button
                type="button"
                onClick={() => handleNextAction(step.key)}
                className="text-[11px] text-primary hover:underline font-bold shrink-0 ml-2"
              >
                Completar
              </button>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
};

