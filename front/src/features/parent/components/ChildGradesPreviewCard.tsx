import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpenCheck, Lock, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useGetActiveSchool } from '@/features/schools/api/useSchool';

export const ChildGradesPreviewCard: React.FC = () => {
  const navigate = useNavigate();
  const { data: school } = useGetActiveSchool();
  const plan = school?.plan || 'BASIC';
  const isPro = plan === 'PRO' || plan === 'ENTERPRISE';

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border/80 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <BookOpenCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-foreground">Libreta de Calificaciones</h3>
            <span className="text-[11px] text-muted-foreground">Evaluación por competencias SIAGIE</span>
          </div>
        </div>

        <Badge
          variant={isPro ? 'default' : 'outline'}
          className={`text-[10px] font-bold ${
            isPro ? 'bg-primary text-primary-foreground' : 'border-amber-500/40 text-amber-600 bg-amber-500/5'
          }`}
        >
          {isPro ? 'Plan PRO' : 'Fase 2 • Plan PRO'}
        </Badge>
      </div>

      {/* Body */}
      {!isPro ? (
        <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-300">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Módulo Académico Plan PRO</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Tu colegio opera actualmente con el <strong>Plan Básico (Fase 1)</strong>. La emisión de libretas de notas digitales se activa cuando la institución actualiza al Plan PRO.
          </p>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-secondary/30 border border-border/40 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-foreground">
            <Sparkles className="w-4 h-4 text-primary shrink-0" />
            <span>Notas y conclusiones descriptivas activas</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Puedes consultar el rendimiento bimestral y notas por área curricular de tu hijo en tiempo real.
          </p>
          <Button
            size="sm"
            onClick={() => navigate('/grades')}
            className="w-full justify-between text-xs h-9 rounded-xl font-bold bg-primary text-primary-foreground"
          >
            <span>Ver libreta de notas</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
