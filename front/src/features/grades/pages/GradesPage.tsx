import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { useGetActiveSchool } from '@/features/schools/api/useSchool';
import { PlanGuard } from '@/components/ui/PlanGuard';
import { Skeleton } from '@/components/ui/skeleton';
import { ParentGradesView } from '@/features/parent/components/ParentGradesView';

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

  // 2. Si el usuario es PADRE / APODERADO o ESTUDIANTE, mostrar su libreta de notas familiar
  if (user?.role === 'PARENT' || user?.role === 'STUDENT') {
    return <ParentGradesView />;
  }

  // 3. Redirecciones según rol
  if (user?.role === 'TEACHER') {
    return <Navigate to="/my-courses" replace />;
  }
  if (user?.role === 'ADMINISTRATIVE') {
    return <Navigate to="/academic/reports" replace />;
  }
  return <Navigate to="/academic/progress" replace />;
};
