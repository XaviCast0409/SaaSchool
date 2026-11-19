import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSelectedAcademicYear } from '@/components/AcademicYearSwitcher';
import { PageHeader } from '@/components/ui/page-header';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/useAuthStore';
import { RiskTab } from '../components/insights/RiskTab';
import { HeatmapTab } from '../components/insights/HeatmapTab';
import { SiagieTab } from '../components/insights/SiagieTab';

type Tab = 'risk' | 'heatmap' | 'siagie';

export const InsightsPage: React.FC = () => {
  const { user } = useAuthStore();
  const role = user?.role;
  const isAdmin = role === 'SCHOOL_ADMIN' || role === 'SUPER_ADMIN';
  const tabs: Array<[Tab, string]> = [
    ...(isAdmin || role === 'TEACHER' ? ([['risk', 'Riesgo académico y tutoría']] as Array<[Tab, string]>) : []),
    ...(isAdmin ? ([['heatmap', 'Mapa de calor']] as Array<[Tab, string]>) : []),
    ...(isAdmin || role === 'ADMINISTRATIVE' ? ([['siagie', 'Datos para el SIAGIE']] as Array<[Tab, string]>) : []),
  ];
  const [params, setParams] = useSearchParams();
  const requested = params.get('tab') as Tab | null;
  const tab: Tab = tabs.some(([t]) => t === requested) ? requested! : (tabs[0]?.[0] ?? 'siagie');
  // La analítica es del día a día: siempre trabaja con el año vigente
  const { isOtherYear, current } = useSelectedAcademicYear();

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Analítica y tutoría"
        description={
          role === 'TEACHER'
            ? 'Estudiantes de tus aulas de tutoría que necesitan atención, y su plan de tutoría.'
            : 'Detecta a tiempo a quién apoyar, dónde está fallando el aprendizaje y qué datos faltan para el SIAGIE.'
        }
      />
      {isOtherYear && current && (
        <p className="mb-4 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-sm text-indigo-900 dark:text-indigo-200">
          La analítica muestra siempre el año vigente (<strong>{current.year}</strong>), aunque en la cabecera estés
          viendo otro año.
        </p>
      )}
      {tabs.length > 1 && (
        <div className="mb-4 inline-flex flex-wrap rounded-lg border border-border p-0.5 text-xs">
          {tabs.map(([t, label]) => (
            <button
              key={t}
              type="button"
              onClick={() => setParams({ tab: t }, { replace: true })}
              className={cn(
                'rounded-md px-3 py-1.5 font-semibold',
                tab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {tab === 'risk' && <RiskTab />}
      {tab === 'heatmap' && <HeatmapTab />}
      {tab === 'siagie' && <SiagieTab />}
    </div>
  );
};
