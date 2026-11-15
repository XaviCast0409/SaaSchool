import React, { useState } from 'react';
import { useUrlFilters } from '@/lib/useUrlFilters';
import { Users, UserPlus, QrCode, FileSpreadsheet, KeyRound, Upload, Repeat2 } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useStudents } from '../api/useStudents';
import { StudentTable } from '../components/StudentTable';
import { EnrollStudentModal } from '../components/EnrollStudentModal';
import { SectionQrCardsModal } from '../components/SectionQrCardsModal';
import { NominaSiagieModal } from '../components/NominaSiagieModal';
import { BulkCredentialsModal } from '../components/BulkCredentialsModal';
import { NominaImportModal } from '@/features/siagie/components/NominaImportModal';
import { useGetActiveSchool } from '@/features/schools/api/useSchool';
import { Button } from '@/components/ui/button';
import { useSelectedAcademicYear } from '@/components/AcademicYearSwitcher';
import { RolloverModal } from '../components/RolloverModal';
import { QuickEnrollModal, type QuickEnrollStudent } from '../components/QuickEnrollModal';
import { useAcademicYears, pickEnrollmentTargetYear } from '@/features/academic-years/api/useAcademicYears';

export const StudentsPage: React.FC = () => {
  const { user } = useAuthStore();
  const canManageStudents =
    user?.role === 'SCHOOL_ADMIN' ||
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'ADMINISTRATIVE';

  // Estados de modales
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [isSectionQrModalOpen, setIsSectionQrModalOpen] = useState(false);
  const [isNominaModalOpen, setIsNominaModalOpen] = useState(false);
  const [isBulkCredentialsModalOpen, setIsBulkCredentialsModalOpen] = useState(false);
  const [isNominaImportOpen, setIsNominaImportOpen] = useState(false);
  const { data: school } = useGetActiveSchool();
  const [isRolloverOpen, setIsRolloverOpen] = useState(false);
  const [quickEnrollStudent, setQuickEnrollStudent] = useState<QuickEnrollStudent | null>(null);
  const { data: years = [] } = useAcademicYears();
  const targetYear = pickEnrollmentTargetYear(years);

  // Estados de paginación y filtros jerárquicos
  // En la URL: sobreviven a recargar y al botón Atrás, y el buscador global (Ctrl+K) abre la lista ya filtrada
  const [urlFilters, setUrlFilters] = useUrlFilters({ page: 1, limit: 10, q: '', classroomId: '', level: '', scope: 'year' });
  const { page, limit, q: search } = urlFilters;
  const classroomId = urlFilters.classroomId || undefined;
  const educationLevel = (['INITIAL', 'PRIMARY', 'SECONDARY'] as const).find((level) => level === urlFilters.level);
  const scope: 'year' | 'all' = urlFilters.scope === 'all' ? 'all' : 'year';
  const setPage = (value: number) => setUrlFilters({ page: value });
  const setLimit = (value: number) => setUrlFilters({ limit: value });
  const setSearch = (value: string) => setUrlFilters({ q: value });
  const setClassroomId = (value: string | undefined) => setUrlFilters({ classroomId: value ?? '' });
  const setEducationLevel = (value: 'INITIAL' | 'PRIMARY' | 'SECONDARY' | undefined) => setUrlFilters({ level: value ?? '' });
  const setScope = (value: 'year' | 'all') => setUrlFilters({ scope: value });

  const { selected: viewedYear } = useSelectedAcademicYear();
  const { data: response, isLoading, isError, refetch } = useStudents({
    scope,
    page,
    limit,
    search,
    classroomId,
    educationLevel,
  });

  const students = response?.data || [];
  const meta = response?.meta;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {scope === 'all' ? 'Directorio de Estudiantes' : `Estudiantes matriculados${viewedYear ? ` ${viewedYear.year}` : ''}`}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Gestión completa por Aula, Grado, Sección y datos demográficos MINEDU.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          {canManageStudents && (
            <Button
              variant="outline"
              onClick={() => setIsBulkCredentialsModalOpen(true)}
              className="gap-2 shadow-sm border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
              title="Generar credenciales de acceso masivas por aula"
            >
              <KeyRound className="w-4 h-4" />
              <span>Credenciales de acceso</span>
            </Button>
          )}

          {canManageStudents && (
            <Button
              variant="outline"
              onClick={() => setIsNominaImportOpen(true)}
              className="gap-2 shadow-sm"
              title="Crear o actualizar alumnos y matrículas desde el listado de estudiantes del SIAGIE"
            >
              <Upload className="w-4 h-4" />
              <span>Importar nómina SIAGIE</span>
            </Button>
          )}

          {canManageStudents && (
            <Button
              variant="outline"
              onClick={() => setIsNominaModalOpen(true)}
              className="gap-2 shadow-sm border-emerald-600/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
              title="Descargar Nómina Oficial de Matrícula del Salón en Excel (SIAGIE)"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Nómina SIAGIE (.xlsx)</span>
            </Button>
          )}

          {canManageStudents && (
            <Button
              variant="outline"
              onClick={() => setIsSectionQrModalOpen(true)}
              className="gap-2 shadow-sm border-primary/30 text-primary hover:bg-primary/10"
              title="Generar e imprimir carnets con QR por grado y sección en hoja A4"
            >
              <QrCode className="w-4 h-4" />
              <span>Carnets QR por Sección (PDF)</span>
            </Button>
          )}

          {canManageStudents && targetYear && (
            <Button
              variant="outline"
              onClick={() => setIsRolloverOpen(true)}
              className="gap-2 shadow-sm border-indigo-500/30 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-500/10"
              title={`Pasar a los alumnos del año vigente al año ${targetYear.year}`}
            >
              <Repeat2 className="w-4 h-4" />
              <span>Re-matrícula {targetYear.year}</span>
            </Button>
          )}

          {canManageStudents && (
            <Button
              onClick={() => setIsEnrollModalOpen(true)}
              className="gap-2 shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              <span>Matricular Estudiante</span>
            </Button>
          )}
        </div>
      </div>

      {/* Matriculados del año que se está viendo o todos los alumnos del colegio */}
      <div className="inline-flex rounded-lg border border-border p-0.5 text-sm">
        {(
          [
            ['year', `Matriculados ${viewedYear?.year ?? ''}`],
            ['all', 'Todos los alumnos'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setScope(key);
              setPage(1);
            }}
            className={`rounded-md px-3 py-1.5 font-semibold ${scope === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isError ? (
        <div className="p-6 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-center space-y-3">
          <p className="font-semibold">Error al cargar la lista de estudiantes.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      ) : (
        <StudentTable
          students={students}
          isLoading={isLoading}
          meta={meta}
          page={page}
          limit={limit}
          search={search}
          classroomId={classroomId}
          educationLevel={educationLevel}
          onPageChange={(p) => setPage(p)}
          onLimitChange={(l) => {
            setLimit(l);
            setPage(1);
          }}
          onSearchChange={(s) => {
            setSearch(s);
            setPage(1);
          }}
          onClassroomChange={(cId) => {
            setClassroomId(cId);
            setPage(1);
          }}
          onEducationLevelChange={(eL) => {
            setEducationLevel(eL);
            setPage(1);
          }}
          onQuickEnroll={(s) =>
            setQuickEnrollStudent({
              id: s.id,
              name: `${s.firstNames} ${s.lastNamePaternal}`,
              documentId: s.documentId,
            })
          }
          quickEnrollLabel={targetYear ? `Matricular ${targetYear.year}` : 'Matricular'}
          onExportNomina={(cId) => {
            if (cId) setClassroomId(cId);
            setIsNominaModalOpen(true);
          }}
        />
      )}

      {/* Modal de Asistente de Matrícula */}
      <EnrollStudentModal
        isOpen={isEnrollModalOpen}
        onClose={() => setIsEnrollModalOpen(false)}
        onQuickEnroll={(s) => {
          setIsEnrollModalOpen(false);
          setQuickEnrollStudent(s);
        }}
      />

      {/* Re-matrícula por aula y matrícula rápida de alumnos existentes */}
      <RolloverModal isOpen={isRolloverOpen} onClose={() => setIsRolloverOpen(false)} />
      <QuickEnrollModal student={quickEnrollStudent} onClose={() => setQuickEnrollStudent(null)} />

      {/* Modal de Carnets QR por Sección en A4 */}
      {isSectionQrModalOpen && (
        <SectionQrCardsModal
          initialClassroomId={classroomId}
          schoolName={school?.name}
          onClose={() => setIsSectionQrModalOpen(false)}
        />
      )}

      {/* Modal de Descarga de Nómina SIAGIE en Excel */}
      {isNominaModalOpen && (
        <NominaSiagieModal
          isOpen={isNominaModalOpen}
          initialClassroomId={classroomId}
          onClose={() => setIsNominaModalOpen(false)}
        />
      )}

      <NominaImportModal open={isNominaImportOpen} onClose={() => setIsNominaImportOpen(false)} />

      {/* Modal de Credenciales de Acceso Masivas */}
      <BulkCredentialsModal
        isOpen={isBulkCredentialsModalOpen}
        onClose={() => setIsBulkCredentialsModalOpen(false)}
      />
    </div>
  );
};
