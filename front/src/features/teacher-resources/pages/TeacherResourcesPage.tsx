import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { cn } from '@/lib/utils';
import { ResourcesTab } from '../components/teacher-resources/ResourcesTab';
import { RubricsTab } from '../components/teacher-resources/RubricsTab';

export const TeacherResourcesPage: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'rubrics' ? 'rubrics' : 'resources';
  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Recursos docentes"
        description="Comparte y reutiliza sesiones, fichas, evaluaciones y rúbricas con los docentes de tu colegio."
      />
      <div className="mb-4 inline-flex rounded-lg border border-border p-0.5 text-xs">
        {(
          [
            ['resources', 'Banco de recursos'],
            ['rubrics', 'Rúbricas'],
          ] as const
        ).map(([t, label]) => (
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
      {tab === 'resources' ? <ResourcesTab /> : <RubricsTab />}
    </div>
  );
};
