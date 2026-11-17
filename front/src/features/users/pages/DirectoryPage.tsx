import { useUrlFilters } from '@/lib/useUrlFilters';
import React, { useState } from 'react';
import { Users, GraduationCap, Shield, UserPlus, Building2, CalendarRange, UserMinus, UserCheck2, Repeat2, ArrowLeftRight } from 'lucide-react';
import { toast } from 'sonner';
import { useSelectedAcademicYear } from '@/components/AcademicYearSwitcher';
import { useSetStaffYear } from '../api/useUsers';
import { RenewStaffModal } from '../components/RenewStaffModal';
import { ReplaceTeacherModal } from '../components/ReplaceTeacherModal';
import type { DirectoryUser } from '../types';
import { StaffLoadPanel } from '../components/StaffLoadPanel';
import { useAuthStore } from '@/store/useAuthStore';
import { useUsers } from '../api/useUsers';
import { UserTable } from '../components/UserTable';
import { UserFormModal } from '../components/UserFormModal';
import { Button } from '@/components/ui/button';
import type { UserRole } from '../types';

type TabKey = 'ALL_STAFF' | 'TEACHER' | 'ADMINISTRATIVE' | 'SCHOOL_ADMIN' | 'YEAR_LOAD';

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
  {
    key: 'YEAR_LOAD',
    label: 'Carga del año',
    icon: CalendarRange,
    description: 'Docentes con cursos o tutoría en el año elegido en la cabecera, y quiénes aún no tienen carga.',
  },
];

export const DirectoryPage: React.FC = () => {
  const { user } = useAuthStore();
  // Filtros en la URL: sobreviven a recargar, al botón Atrás y se pueden compartir como enlace
  const [urlFilters, setUrlFilters] = useUrlFilters({ tab: 'ALL_STAFF', scope: 'year' });
  const activeTab = urlFilters.tab as TabKey;
  const yearScope: 'year' | 'all' = urlFilters.scope === 'all' ? 'all' : 'year';
  const setActiveTab = (value: TabKey) => setUrlFilters({ tab: value });
  const setYearScope = (value: 'year' | 'all') => setUrlFilters({ scope: value });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Personal contratado en el año que se está viendo, o todo el personal del colegio
  const [renewOpen, setRenewOpen] = useState(false);
  const [replacing, setReplacing] = useState<DirectoryUser | null>(null);
  const { selected: viewedYear, current: currentYear } = useSelectedAcademicYear();
  const setStaffYear = useSetStaffYear();

  const userQueryParams =
    activeTab === 'ALL_STAFF' || activeTab === 'YEAR_LOAD'
      ? { staffOnly: true, yearScope }
      : { role: activeTab as UserRole, yearScope };

  const { data: rawUsers = [], isLoading, isError, refetch } = useUsers(userQueryParams);

  // Filtrar estrictamente: solo Profesores (TEACHER), Administrativos (ADMINISTRATIVE) y Directores (SCHOOL_ADMIN).
  const staffUsers = rawUsers.filter(
    (u) => u.role === 'TEACHER' || u.role === 'ADMINISTRATIVE' || u.role === 'SCHOOL_ADMIN'
  );

  const isAdmin = user?.role === 'SCHOOL_ADMIN' || user?.role === 'SUPER_ADMIN';

  const toggleHired = (u: DirectoryUser) => {
    if (!viewedYear) return;
    const hired = !(u.staffYears && u.staffYears.length > 0);
    setStaffYear.mutate(
      { userId: u.id, academicYearId: viewedYear.id, hired },
      {
        onSuccess: () =>
          toast.success(`${u.firstName} ${u.lastNamePaternal} ${hired ? 'quedó contratado(a)' : 'ya no figura en el personal'} de ${viewedYear.year}.`),
        onError: (err: any) => toast.error(err?.response?.data?.message || 'No se pudo actualizar.'),
      },
    );
  };

  const renderYearAction = (u: DirectoryUser) => {
    if (!isAdmin || !viewedYear || !u.isActive) return null;
    const hired = !!u.staffYears && u.staffYears.length > 0;
    return (
      <>
      {u.role === 'TEACHER' && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setReplacing(u)}
          className="h-7 px-2 text-xs text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 font-bold"
          title="Pasar sus cursos y tutoría a otro docente (renuncia, licencia)"
        >
          <ArrowLeftRight className="w-3.5 h-3.5 mr-1" />
          Reemplazar
        </Button>
      )}
      {/* Solo los docentes se contratan por año; Dirección y Secretaría figuran siempre */}
      {u.role === 'TEACHER' && (
      <Button
        variant="ghost"
        size="sm"
        disabled={setStaffYear.isPending}
        onClick={() => toggleHired(u)}
        className={`h-7 px-2 text-xs ${hired ? 'text-muted-foreground hover:bg-muted' : 'text-indigo-600 dark:text-indigo-300 hover:bg-indigo-500/10 font-bold'}`}
        title={hired ? `Quitar del personal de ${viewedYear.year}` : `Contratar para ${viewedYear.year}`}
      >
        {hired ? <UserMinus className="w-3.5 h-3.5 mr-1" /> : <UserCheck2 className="w-3.5 h-3.5 mr-1" />}
        {hired ? `Quitar de ${viewedYear.year}` : `Contratar ${viewedYear.year}`}
      </Button>
      )}
      </>
    );
  };

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
              {yearScope === 'year' && viewedYear ? `Personal ${viewedYear.year}` : 'Directorio Institucional de Personal'}
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

      {/* Personal del año que se está viendo o todo el personal */}
      {activeTab !== 'YEAR_LOAD' && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-border p-0.5 text-sm">
            {(
              [
                ['year', `Personal ${viewedYear?.year ?? ''}`],
                ['all', 'Todo el personal'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setYearScope(key)}
                className={`rounded-md px-3 py-1.5 font-semibold ${yearScope === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {label}
              </button>
            ))}
          </div>
          {isAdmin && viewedYear && currentYear && viewedYear.id !== currentYear.id && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setRenewOpen(true)}>
              <Repeat2 className="w-4 h-4" /> Renovar personal de {currentYear.year} para {viewedYear.year}
            </Button>
          )}
        </div>
      )}

      {/* Tab Context Description */}
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground bg-muted/40 rounded-xl px-4 py-3 border border-border/60">
        <div className="flex items-center gap-2">
          <TabIcon className="w-4 h-4 text-primary shrink-0" />
          <span>{currentTab.description}</span>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'YEAR_LOAD' ? (
        <StaffLoadPanel />
      ) : isError ? (
        <div className="p-6 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-center space-y-3">
          <p className="font-semibold">Error al cargar el personal institucional.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      ) : (
        <>
          {!isLoading && yearScope === 'year' && staffUsers.length === 0 && viewedYear && (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              {activeTab === 'TEACHER' || activeTab === 'ALL_STAFF' ? `Aún no hay docentes contratados para ${viewedYear.year}.` : 'No hay personal activo en este cargo.'}{' '}
              {isAdmin && currentYear && viewedYear.id !== currentYear.id
                ? `Usa "Renovar personal de ${currentYear.year}" o, en "Todo el personal", "Contratar ${viewedYear.year}" en cada persona.`
                : ''}
            </div>
          )}
          <UserTable users={staffUsers} isLoading={isLoading} showStudentLinks={false} renderExtraActions={renderYearAction} />
        </>
      )}

      {replacing && <ReplaceTeacherModal teacher={replacing} onClose={() => setReplacing(null)} />}
      {renewOpen && viewedYear && currentYear && (
        <RenewStaffModal fromYear={currentYear} toYear={viewedYear} onClose={() => setRenewOpen(false)} />
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
