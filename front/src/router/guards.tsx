import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { NoAccessPage } from '@/components/ui/StatusPages';
import type { Role } from '@/lib/roles';

export const TeacherAssignmentsRedirect: React.FC = () => {
  const role = useAuthStore((s) => s.user?.role);
  return <Navigate to={role === 'TEACHER' ? '/my-courses' : '/academic/teaching-load'} replace />;
};

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = useAuthStore((state) => state.token);
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

export const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = useAuthStore((state) => state.token);
  if (token) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

/** Guardia por Rol: si el usuario entra por URL a una sección que su rol no incluye, se le avisa */
export const RoleGuard: React.FC<{
  allowedRoles: readonly Role[];
  disallowStudents?: boolean;
  children: React.ReactNode;
}> = ({ allowedRoles, disallowStudents = false, children }) => {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);

  if (token && !user) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Sin permiso: se explica en lugar de redirigir en silencio al inicio
  if (!allowedRoles.includes(user.role as Role) || (disallowStudents && user.role === 'STUDENT')) {
    return <NoAccessPage />;
  }

  return <>{children}</>;
};
