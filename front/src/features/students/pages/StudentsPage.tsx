import React, { useState } from 'react';
import { useUrlFilters } from '@/lib/useUrlFilters';
import { UserPlus, QrCode, FileSpreadsheet, KeyRound, Upload, Repeat2, FileUp, ChevronDown } from 'lucide-react';
import { useStudents } from '../api/useStudents';
import { StudentTable } from '../components/StudentTable';
import { FamiliesPanel } from '../components/FamiliesPanel';
import { EnrollStudentModal } from '../components/EnrollStudentModal';
import { SectionQrCardsModal } from '../components/SectionQrCardsModal';
import { NominaSiagieModal } from '../components/NominaSiagieModal';
import { BulkCredentialsModal } from '../components/BulkCredentialsModal';
import { StudentImportModal } from '../components/StudentImportModal';
import { NominaImportModal } from '@/features/siagie/components/NominaImportModal';
import { useGetActiveSchool } from '@/features/schools/api/useSchool';
import { Button } from '@/components/ui/button';
import { Tabs } from '@/components/ui/tabs';
import { useSelectedAcademicYear } from '@/components/AcademicYearSwitcher';
import { RolloverModal } from '../components/RolloverModal';
import { QuickEnrollModal, type QuickEnrollStudent } from '../components/QuickEnrollModal';
import { useAcademicYears, pickEnrollmentTargetYear } from '@/features/academic-years/api/useAcademicYears';
import { useQueryAction } from '@/lib/useQueryAction';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type Level = 'INITIAL' | 'PRIMARY' | 'SECONDARY';
type View = 'students' | 'families';

/** Alumnos y familias: matrícula, fichas, carnets y apoderados. Solo Dirección y Secretaría (RoleGuard). */
export const StudentsPage: React.FC = () => {
  // Un acceso rápido del Inicio puede abrir un modal con ?abrir=
  const openAction = useQueryAction();
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(() => openAction === 'matricula');
  const [isSectionQrModalOpen, setIsSectionQrModalOpen] = useState(() => openAction === 'carnets');
  const [isNominaModalOpen, setIsNominaModalOpen] = useState(false);
  const [isBulkCredentialsModalOpen, setIsBulkCredentialsModalOpen] = useState(false);
  const [isNominaImportOpen, setIsNominaImportOpen] = useState(false);
  const [isStudentImportOpen, setIsStudentImportOpen] = useState(false);
  const [isRolloverOpen, setIsRolloverOpen] = useState(false);
  const [quickEnrollStudent, setQuickEnrollStudent] = useState<QuickEnrollStudent | null>(null);
  const { data: school } = useGetActiveSchool();
  const { data: years = [] } = useAcademicYears();
  const targetYear = pickEnrollmentTargetYear(years);

  // En la URL: sobreviven a recargar y al botón Atrás, y el buscador global (Ctrl+K) abre la lista ya filtrada
  const [url, setUrl] = useUrlFilters({
    view: 'students',
    page: 1,
    limit: 10,
    q: '',
    classroomId: '',
    level: '',
    scope: 'year',
    // Familias
    fq: '',
    fpage: 1,
    flimit: 20,
    unlinked: false as boolean,
  });
  const view: View = url.view === 'families' ? 'families' : 'students';
  const classroomId = url.classroomId || undefined;
  const educationLevel = (['INITIAL', 'PRIMARY', 'SECONDARY'] as const).find((level) => level === url.level);
  const scope: 'year' | 'all' = url.scope === 'all' ? 'all' : 'year';

  const { selected: viewedYear } = useSelectedAcademicYear();
  const {
    data: response,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useStudents(
    { scope, page: url.page, limit: url.limit, search: url.q, classroomId, educationLevel },
    view === 'students',
    { keepPrevious: true },
  );

  const students = response?.data || [];
  const meta = response?.meta;

  const emptyActions = (
    <div className="flex flex-wrap justify-center gap-2">
      <Button size="sm" className="gap-1.5" onClick={() => setIsEnrollModalOpen(true)}>
        <UserPlus className="w-4 h-4" /> Matricular estudiante
      </Button>
      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setIsStudentImportOpen(true)}>
        <FileUp className="w-4 h-4" /> Carga masiva (Excel)
      </Button>
    </div>
  );

  return (
    <div className="space-y-5 pb-8">
      {/* Cabecera: una acción principal y el resto agrupado */}
      <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Alumnos y familias</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Matrícula, fichas SIAGIE, carnets y apoderados{viewedYear ? ` · año ${viewedYear.year}` : ''}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-1.5">
                Más acciones
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-72">
              <DropdownMenuLabel>Cargar alumnos</DropdownMenuLabel>
              <DropdownMenuItem
                icon={FileUp}
                hint="Alumnos, matrículas y apoderados desde la plantilla"
                onSelect={() => setIsStudentImportOpen(true)}
              >
                Carga masiva (Excel)
              </DropdownMenuItem>
              <DropdownMenuItem
                icon={Upload}
                hint="Crea o actualiza desde el listado del SIAGIE"
                onSelect={() => setIsNominaImportOpen(true)}
              >
                Importar nómina SIAGIE
              </DropdownMenuItem>
              {targetYear && (
                <DropdownMenuItem
                  icon={Repeat2}
                  hint={`Pasar a los alumnos del año vigente al ${targetYear.year}`}
                  onSelect={() => setIsRolloverOpen(true)}
                >
                  Re-matrícula {targetYear.year}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Documentos por aula</DropdownMenuLabel>
              <DropdownMenuItem
                icon={FileSpreadsheet}
                hint="Nómina oficial de matrícula (.xlsx)"
                onSelect={() => setIsNominaModalOpen(true)}
              >
                Descargar nómina SIAGIE
              </DropdownMenuItem>
              <DropdownMenuItem
                icon={QrCode}
                hint="Carnets con QR para imprimir en A4"
                onSelect={() => setIsSectionQrModalOpen(true)}
              >
                Carnets QR por sección
              </DropdownMenuItem>
              <DropdownMenuItem
                icon={KeyRound}
                hint="Usuarios y claves de alumnos y familias"
                onSelect={() => setIsBulkCredentialsModalOpen(true)}
              >
                Credenciales de acceso
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button onClick={() => setIsEnrollModalOpen(true)} className="gap-2">
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Matricular estudiante</span>
            <span className="sm:hidden">Matricular</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs<View>
          value={view}
          onChange={(v) => setUrl({ view: v })}
          items={[
            { value: 'students', label: 'Alumnos' },
            { value: 'families', label: 'Familias' },
          ]}
        />

        {/* Matriculados del año que se está viendo o todos los alumnos del colegio */}
        {view === 'students' && (
          <div
            className="inline-flex rounded-lg border border-border p-0.5 text-sm"
            role="group"
            aria-label="Qué alumnos ver"
          >
            {(
              [
                ['year', `Matriculados ${viewedYear?.year ?? ''}`.trim()],
                ['all', 'Todos los alumnos'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-pressed={scope === key}
                onClick={() => setUrl({ scope: key, page: 1 })}
                className={`rounded-md px-3 py-1.5 font-semibold ${scope === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {view === 'families' ? (
        <FamiliesPanel
          search={url.fq}
          page={url.fpage}
          limit={url.flimit}
          unlinked={url.unlinked}
          onChange={(patch) => setUrl(patch)}
          onOpenStudent={(name) =>
            setUrl({ view: 'students', q: name, scope: 'all', page: 1, classroomId: '', level: '' })
          }
        />
      ) : isError ? (
        <div className="p-6 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-center space-y-3">
          <p className="font-semibold">No se pudo cargar la lista de estudiantes.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      ) : (
        <StudentTable
          students={students}
          isLoading={isLoading}
          isFetching={isFetching}
          meta={meta}
          page={url.page}
          limit={url.limit}
          search={url.q}
          classroomId={classroomId}
          educationLevel={educationLevel}
          onPageChange={(p) => setUrl({ page: p })}
          onLimitChange={(l) => setUrl({ limit: l, page: 1 })}
          onSearchChange={(s) => setUrl({ q: s, page: 1 })}
          onClassroomChange={(cId) => setUrl({ classroomId: cId ?? '', page: 1 })}
          onEducationLevelChange={(eL?: Level) => setUrl({ level: eL ?? '', page: 1 })}
          onResetFilters={() => setUrl({ q: '', classroomId: '', level: '', page: 1 })}
          onQuickEnroll={(s) =>
            setQuickEnrollStudent({
              id: s.id,
              name: `${s.firstNames} ${s.lastNamePaternal}`,
              documentId: s.documentId,
            })
          }
          quickEnrollLabel={targetYear ? `Matricular en ${targetYear.year}` : 'Matricular'}
          onExportNomina={(cId) => {
            if (cId) setUrl({ classroomId: cId });
            setIsNominaModalOpen(true);
          }}
          emptyAction={emptyActions}
        />
      )}

      <EnrollStudentModal
        isOpen={isEnrollModalOpen}
        onClose={() => setIsEnrollModalOpen(false)}
        onQuickEnroll={(s) => {
          setIsEnrollModalOpen(false);
          setQuickEnrollStudent(s);
        }}
      />

      <RolloverModal isOpen={isRolloverOpen} onClose={() => setIsRolloverOpen(false)} />
      <QuickEnrollModal student={quickEnrollStudent} onClose={() => setQuickEnrollStudent(null)} />

      {isSectionQrModalOpen && (
        <SectionQrCardsModal
          initialClassroomId={classroomId}
          schoolName={school?.name}
          onClose={() => setIsSectionQrModalOpen(false)}
        />
      )}

      {isNominaModalOpen && (
        <NominaSiagieModal isOpen initialClassroomId={classroomId} onClose={() => setIsNominaModalOpen(false)} />
      )}

      <NominaImportModal open={isNominaImportOpen} onClose={() => setIsNominaImportOpen(false)} />
      <StudentImportModal open={isStudentImportOpen} onClose={() => setIsStudentImportOpen(false)} />
      <BulkCredentialsModal isOpen={isBulkCredentialsModalOpen} onClose={() => setIsBulkCredentialsModalOpen(false)} />
    </div>
  );
};
