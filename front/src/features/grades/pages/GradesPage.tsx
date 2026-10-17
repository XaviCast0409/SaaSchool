import React from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useGetActiveSchool } from '@/features/schools/api/useSchool';
import { PlanGuard } from '@/components/ui/PlanGuard';
import { Skeleton } from '@/components/ui/skeleton';
import { ParentGradesView } from '@/features/parent/components/ParentGradesView';
import { TeacherAdminGradesView } from '../components/TeacherAdminGradesView';

export const GradesPage: React.FC = () => {
  const { user } = useAuthStore();
  const { data: school, isLoading: loadingSchool } = useGetActiveSchool();

  const plan = school?.plan || 'BASIC';
  const isPro = plan === 'PRO' || plan === 'ENTERPRISE';

  if (loadingSchool) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  // 1. Si el colegio opera con el Plan Básico (Fase 1), bloquear vista sin ejecutar queries internas
  if (!isPro) {
    return (
      <PlanGuard minPlan="PRO">
        <div />
      </PlanGuard>
    );
  }

  // 2. Si el usuario es PADRE / APODERADO, mostrar su libreta de notas familiar
  if (user?.role === 'PARENT') {
    return <ParentGradesView />;
  }

  // 3. Si es DOCENTE o ADMINISTRACIÓN, mostrar la matriz de ingreso y consolidado SIAGIE
  return <TeacherAdminGradesView />;
};
