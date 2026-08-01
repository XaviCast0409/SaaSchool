import React, { useState } from 'react';
import { Users, GraduationCap, UserCheck, Shield, UserPlus } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useUsers } from '../api/useUsers';
import { UserTable } from '../components/UserTable';
import { UserFormModal } from '../components/UserFormModal';
import { Button } from '@/components/ui/button';
import type { UserRole } from '../types';

type TabKey = 'TEACHER' | 'PARENT' | 'SCHOOL_ADMIN';

interface Tab {
  key: TabKey;
  label: string;
  icon: React.ElementType;
  description: string;
  showStudentLinks: boolean;
}

const TABS: Tab[] = [
  {
    key: 'TEACHER',
    label: 'Profesores',
    icon: GraduationCap,
    description: 'Gestión de docentes del colegio.',
    showStudentLinks: false,
  },
  {
    key: 'PARENT',
    label: 'Apoderados / Padres',
    icon: UserCheck,
    description: 'Apoderados vinculados a los estudiantes.',
    showStudentLinks: true,
  },
  {
    key: 'SCHOOL_ADMIN',
    label: 'Administradores',
    icon: Shield,
    description: 'Personal administrativo con acceso completo.',
    showStudentLinks: false,
  },
];

export const DirectoryPage: React.FC = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabKey>('TEACHER');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { data: users = [], isLoading, isError, refetch } = useUsers(activeTab as UserRole);
  const { data: allParents = [] } = useUsers('PARENT');

  const isAdmin = user?.role === 'SCHOOL_ADMIN' || user?.role === 'SUPER_ADMIN';

  const currentTab = TABS.find((t) => t.key === activeTab)!;
  const TabIcon = currentTab.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Directorio Digital
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Gestión de Profesores, Apoderados y Administradores del colegio.
          </p>
        </div>

        {isAdmin && (
          <Button
            className="gap-2 self-start md:self-auto"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <UserPlus className="w-4 h-4" />
            <span>Registrar {currentTab.label.split(' /')[0]}</span>
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
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap -mb-px ${
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
      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-2.5 border border-border/60">
        <TabIcon className="w-4 h-4 text-primary shrink-0" />
        <span>{currentTab.description}</span>
        {activeTab === 'PARENT' && (
          <span className="ml-auto text-xs font-semibold text-primary">
            Haz clic en ▼ para ver y vincular alumnos de cada apoderado
          </span>
        )}
      </div>

      {/* Content */}
      {isError ? (
        <div className="p-6 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-center space-y-3">
          <p className="font-semibold">Error al cargar el directorio.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      ) : (
        <UserTable
          users={users}
          isLoading={isLoading}
          allParents={allParents}
          showStudentLinks={currentTab.showStudentLinks}
        />
      )}

      {/* Modal Crear Usuario */}
      {isCreateModalOpen && (
        <UserFormModal
          defaultRole={activeTab}
          onClose={() => setIsCreateModalOpen(false)}
        />
      )}
    </div>
  );
};
