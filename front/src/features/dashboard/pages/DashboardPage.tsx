import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { ParentPortalPage } from '@/features/parent/pages/ParentPortalPage';
import { TeacherDashboardView } from '../components/TeacherDashboardView';
import { StaffDashboardView } from '../components/dashboard/StaffDashboardView';

export const DashboardPage: React.FC = () => {
  const { user, impersonatedSchool } = useAuthStore();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user?.role === 'SUPER_ADMIN' && !impersonatedSchool) {
      navigate('/super-admin', { replace: true });
    }
  }, [user, impersonatedSchool, navigate]);

  if (user?.role === 'SUPER_ADMIN' && !impersonatedSchool) {
    return null;
  }

  // Si el usuario es PADRE / APODERADO o ESTUDIANTE, renderizar directamente su portal
  if (user?.role === 'PARENT' || user?.role === 'STUDENT') {
    return <ParentPortalPage />;
  }

  // Si el usuario es PROFESOR / DOCENTE, renderizar su panel docente especializado
  if (user?.role === 'TEACHER') {
    return <TeacherDashboardView />;
  }

  // Dirección / Secretaría: componente propio para que sus hooks no dependan del rol
  return <StaffDashboardView />;
};
