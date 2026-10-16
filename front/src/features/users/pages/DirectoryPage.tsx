import React, { useState } from 'react';
import { Users, GraduationCap, Shield, UserPlus, Building2 } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useUsers } from '../api/useUsers';
import { UserTable } from '../components/UserTable';
import { UserFormModal } from '../components/UserFormModal';
import { Button } from '@/components/ui/button';
import type { UserRole } from '../types';

type TabKey = 'ALL_STAFF' | 'TEACHER' | 'ADMINISTRATIVE' | 'SCHOOL_ADMIN';

interface Tab {
  key: TabKey;
  label: string;
  icon: React.ElementType;
  description: string;
}

const TABS: Tab[] = [
  {
    key: 'ALL_STAFF',
    label: 'Todo el Personal del Colegio',
    icon: Building2,
    description: 'Directorio consolidado de la plana docente y equipo administrativo del colegio.',
  },
  {
    key: 'TEACHER',
    label: 'Profesores / Docentes',
    icon: GraduationCap,
    description: 'Plana docente y profesores de aula.',
  },
  {
    key: 'ADMINISTRATIVE',
    label: 'Secretaría / Caja',
    icon: Users,
    description: 'Personal administrativo de atención, matrículas y cobranza en ventanilla.',
  },
  {
    key: 'SCHOOL_ADMIN',
    label: 'Dirección y Promotoría',
    icon: Shield,
    description: 'Directores, coordinadores académicos y administradores generales.',
  },
];

export const DirectoryPage: React.FC = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabKey>('ALL_STAFF');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const userQueryParams =
    activeTab === 'ALL_STAFF'
      ? { staffOnly: true }
      : { role: activeTab as UserRole };

  const { data: rawUsers = [], isLoading, isError, refetch } = useUsers(userQueryParams);

  // Filtrar estrictamente: solo Profesores (TEACHER), Administrativos (ADMINISTRATIVE) y Directores (SCHOOL_ADMIN).
  const staffUsers = rawUsers.filter(
    (u) => u.role === 'TEACHER' || u.role === 'ADMINISTRATIVE' || u.role === 'SCHOOL_ADMIN'
  );

  const isAdmin = user?.role === 'SCHOOL_ADMIN' || user?.role === 'SUPER_ADMIN';

  const currentTab = TABS.find((t) => t.key === activeTab)!;
  const TabIcon = currentTab.icon;

  const defaultRoleForCreate: 'TEACHER' | 'ADMINISTRATIVE' | 'SCHOOL_ADMIN' =
    activeTab === 'SCHOOL_ADMIN'
      ? 'SCHOOL_ADMIN'
      : activeTab === 'ADMINISTRATIVE'
      ? 'ADMINISTRATIVE'
      : 'TEACHER';

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Directorio Institucional de Personal
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Gestión y consulta del equipo docente y administrativo de la institución educativa.
          </p>
        </div>

        {isAdmin && (
          <Button
            className="gap-2 self-start md:self-auto shadow-sm"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <UserPlus className="w-4 h-4" />
            <span>Registrar Personal</span>
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border overflow-x-auto pb-0 -mb-px">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap -mb-px ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Context Description */}
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground bg-muted/40 rounded-xl px-4 py-3 border border-border/60">
        <div className="flex items-center gap-2">
          <TabIcon className="w-4 h-4 text-primary shrink-0" />
          <span>{currentTab.description}</span>
        </div>
      </div>

      {/* Content */}
      {isError ? (
        <div className="p-6 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-center space-y-3">
          <p className="font-semibold">Error al cargar el personal institucional.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      ) : (
        <UserTable
          users={staffUsers}
          isLoading={isLoading}
          showStudentLinks={false}
        />
      )}

      {/* Modal Crear Personal */}
      {isCreateModalOpen && (
        <UserFormModal
          defaultRole={defaultRoleForCreate}
          onClose={() => setIsCreateModalOpen(false)}
        />
      )}
    </div>
  );
};
