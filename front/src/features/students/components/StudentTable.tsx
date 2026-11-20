import { getApiErrorMessage } from '@/lib/errors';
import { confirmDialog } from '@/components/ui/confirm';
import React, { useEffect, useRef, useState } from 'react';
import {
  Search,
  UserCheck,
  ChevronDown,
  Users,
  Accessibility,
  BookOpen,
  Pencil,
  FileText,
  QrCode,
  FileSpreadsheet,
  FileCheck2,
  KeyRound,
  Repeat2,
  UserMinus,
  MoreHorizontal,
  AlertTriangle,
  X,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Student, StudentEnrollment } from '../types';
import { useClassrooms } from '@/features/classrooms/api/useClassrooms';
import { useGetActiveSchool } from '@/features/schools/api/useSchool';
import { useResetStudentPassword } from '../api/useStudents';
import { StudentParentsPanel } from '@/features/users/family-relationships/components/StudentParentsPanel';
import { EditStudentModal } from './EditStudentModal';
import { StudentFichaModal } from './StudentFichaModal';
import { StudentQrCardModal } from './StudentQrCardModal';
import { StudentCertificateModal } from './StudentCertificateModal';
import { WithdrawStudentModal, type WithdrawTarget } from './WithdrawStudentModal';
import { TemporaryCredentialsDialog, type TemporaryCredential } from '@/components/ui/TemporaryCredentialsDialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatFullName, formatEducationLevel } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type Level = 'INITIAL' | 'PRIMARY' | 'SECONDARY';

interface StudentTableProps {
  students: Student[];
  isLoading: boolean;
  /** Se está trayendo otra página o búsqueda (la lista anterior sigue visible) */
  isFetching?: boolean;
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  page: number;
  limit: number;
  search: string;
  classroomId?: string;
  educationLevel?: Level;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onSearchChange: (search: string) => void;
  onClassroomChange: (classroomId?: string) => void;
  onEducationLevelChange: (level?: Level) => void;
  onResetFilters: () => void;
  onExportNomina?: (classroomId?: string) => void;
  /** Matrícula rápida (p. ej. en el año siguiente) sin volver a llenar la ficha */
  onQuickEnroll?: (student: Student) => void;
  quickEnrollLabel?: string;
  /** Qué ofrecer cuando aún no hay alumnos (sin filtros) */
  emptyAction?: React.ReactNode;
}

const classroomLabel = (c: NonNullable<StudentEnrollment['classroom']>) =>
  `${c.grade}° "${c.section}" · ${formatEducationLevel(c.educationLevel)}`;

const shortDate = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString('es-PE');

/** Datos de la fila que usan la tabla y las tarjetas del celular */
const rowInfo = (student: Student) => {
  const enrollment = student.enrollments?.find((e) => e.classroom);
  const classroom = enrollment?.classroom;
  const hasLeft = !!enrollment?.enrollmentState && enrollment.enrollmentState !== 'REGISTERED';
  const guardians = student._count?.familyRelations;
  return { enrollment, classroom, hasLeft, guardians };
};

export const StudentTable: React.FC<StudentTableProps> = ({
  students,
  isLoading,
  isFetching = false,
  meta,
  page,
  limit,
  search,
  classroomId,
  educationLevel,
  onPageChange,
  onLimitChange,
  onSearchChange,
  onClassroomChange,
  onEducationLevelChange,
  onResetFilters,
  onExportNomina,
  onQuickEnroll,
  quickEnrollLabel = 'Matricular',
  emptyAction,
}) => {
  // La página ya está restringida a Dirección y Secretaría (RoleGuard): todos pueden gestionar
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
  const [selectedStudentForEdit, setSelectedStudentForEdit] = useState<Student | null>(null);
  const [selectedStudentForFicha, setSelectedStudentForFicha] = useState<string | null>(null);
  const [selectedStudentForQr, setSelectedStudentForQr] = useState<Student | null>(null);
  const [selectedStudentForCertificates, setSelectedStudentForCertificates] = useState<Student | null>(null);
  const [withdrawTarget, setWithdrawTarget] = useState<WithdrawTarget | null>(null);
  const [tempCredentials, setTempCredentials] = useState<TemporaryCredential[] | null>(null);

  const { data: classrooms = [] } = useClassrooms();
  const { data: school } = useGetActiveSchool();
  const { mutateAsync: resetStudentPassword } = useResetStudentPassword();

  // Búsqueda: se escribe libre y se consulta al dejar de teclear (no una petición por tecla)
  const [term, setTerm] = useState(search);
  const debouncedTerm = useDebouncedValue(term, 300);
  const pushedSearch = useRef(search);
  useEffect(() => {
    const next = debouncedTerm.trim();
    if (next !== search) {
      pushedSearch.current = next;
      onSearchChange(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedTerm]);
  // Si la búsqueda cambia desde fuera (Limpiar filtros, Ctrl+K), el cuadro la refleja;
  // la que acabamos de enviar no, para no pisar lo que se sigue escribiendo
  useEffect(() => {
    if (search !== pushedSearch.current) {
      pushedSearch.current = search;
      setTerm(search);
    }
  }, [search]);

  const hasFilters = Boolean(search || classroomId || educationLevel);

  const resetPassword = async (student: Student) => {
    const name = `${student.firstNames} ${student.lastNamePaternal}`;
    const ok = await confirmDialog({
      title: '¿Restablecer la contraseña?',
      description: `Se generará una contraseña temporal para ${name}. La actual dejará de funcionar.`,
      confirmText: 'Restablecer',
    });
    if (!ok) return;
    try {
      const data = await resetStudentPassword({ studentId: student.id });
      setTempCredentials([
        { name, login: student.studentCode || student.documentId, password: data.temporaryPassword },
      ]);
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'No se pudo restablecer la contraseña.'));
    }
  };

  const openWithdraw = (student: Student) => {
    const { enrollment, classroom } = rowInfo(student);
    if (!enrollment) return;
    setWithdrawTarget({
      enrollmentId: enrollment.id,
      studentName: formatFullName(student, 'LAST_FIRST'),
      enrollmentState: enrollment.enrollmentState ?? 'REGISTERED',
      withdrawalDate: enrollment.withdrawalDate,
      classroomLabel: classroom ? classroomLabel(classroom) : undefined,
      academicYear: enrollment.academicYear,
    });
  };

  const toggleGuardians = (studentId: string) => setExpandedStudentId((id) => (id === studentId ? null : studentId));

  // ---------------------------------------------------------------- piezas de cada fila
  const rowMenu = (student: Student) => {
    const { enrollment, hasLeft } = rowInfo(student);
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label={`Más acciones para ${student.firstNames}`}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem icon={Pencil} onSelect={() => setSelectedStudentForEdit(student)}>
            Editar datos
          </DropdownMenuItem>
          <DropdownMenuItem icon={FileText} onSelect={() => setSelectedStudentForFicha(student.id)}>
            Ficha de matrícula SIAGIE
          </DropdownMenuItem>
          {onQuickEnroll && (
            <DropdownMenuItem
              icon={Repeat2}
              hint="Sin volver a llenar la ficha"
              onSelect={() => onQuickEnroll(student)}
            >
              {quickEnrollLabel}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem icon={QrCode} onSelect={() => setSelectedStudentForQr(student)}>
            Carnet con QR
          </DropdownMenuItem>
          <DropdownMenuItem
            icon={FileCheck2}
            hint="Matrícula y no adeudo"
            onSelect={() => setSelectedStudentForCertificates(student)}
          >
            Constancias
          </DropdownMenuItem>
          {student.documentId && (
            <DropdownMenuItem icon={KeyRound} hint="Clave temporal del alumno" onSelect={() => resetPassword(student)}>
              Restablecer contraseña
            </DropdownMenuItem>
          )}
          {enrollment && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                icon={hasLeft ? UserCheck : UserMinus}
                destructive={!hasLeft}
                hint={hasLeft ? 'Vuelve a su aula' : 'Retiro o traslado a mitad de año'}
                onSelect={() => openWithdraw(student)}
              >
                {hasLeft ? 'Reincorporar' : 'Registrar retiro'}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const classroomCell = (student: Student) => {
    const { enrollment, classroom, hasLeft } = rowInfo(student);
    if (!classroom) return <span className="text-xs text-muted-foreground italic">Sin aula</span>;
    return (
      <div className="flex flex-col items-start gap-1">
        <span
          className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground font-semibold ${hasLeft ? 'opacity-60' : ''}`}
        >
          <BookOpen className="w-3 h-3 text-primary" />
          {classroomLabel(classroom)}
        </span>
        {hasLeft && (
          <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold">
            {enrollment?.enrollmentState === 'TRANSFERRED' ? 'Trasladado' : 'Retirado'}
            {enrollment?.withdrawalDate ? ` el ${shortDate(enrollment.withdrawalDate)}` : ''}
          </span>
        )}
      </div>
    );
  };

  const guardiansButton = (student: Student) => {
    const { guardians } = rowInfo(student);
    const open = expandedStudentId === student.id;
    const missing = guardians === 0;
    return (
      <button
        type="button"
        onClick={() => toggleGuardians(student.id)}
        aria-expanded={open}
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${
          missing
            ? 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20'
            : 'border-border text-muted-foreground hover:bg-secondary hover:text-foreground'
        }`}
        title={missing ? 'Sin apoderado: la familia no recibe avisos ni puede ver notas' : 'Ver y vincular apoderados'}
      >
        {missing ? <AlertTriangle className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
        {missing
          ? 'Sin apoderado'
          : guardians === undefined
            ? 'Apoderados'
            : `${guardians} apoderado${guardians === 1 ? '' : 's'}`}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
    );
  };

  const nameBlock = (student: Student) => (
    <div className="min-w-0">
      <button
        type="button"
        onClick={() => setSelectedStudentForFicha(student.id)}
        className="text-left font-semibold text-foreground hover:text-primary hover:underline underline-offset-2"
        title="Ver ficha de matrícula"
      >
        {formatFullName(student, 'LAST_FIRST')}
      </button>
      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
        <span>
          {student.documentType} {student.documentId}
        </span>
        <span className="font-mono">{student.studentCode ? `Cód. ${student.studentCode}` : 'Sin código SIAGIE'}</span>
        {student.hasDisability && (
          <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
            <Accessibility className="w-3 h-3" />
            {student.disabilityType || 'NEE'}
          </span>
        )}
      </div>
    </div>
  );

  const parentsPanel = (student: Student) => (
    <StudentParentsPanel studentId={student.id} studentName={formatFullName(student, 'LAST_FIRST')} />
  );

  // ---------------------------------------------------------------- render
  const selectClass =
    'h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring';

  return (
    <div className="space-y-4">
      {/* Búsqueda y filtros */}
      <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3 shadow-sm lg:flex-row lg:items-center">
        <div className="relative w-full lg:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por nombre, apellidos, DNI o código"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            className="h-9 pl-9 pr-9"
            aria-label="Buscar alumno"
          />
          {isFetching && !isLoading && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
          <select
            value={classroomId || ''}
            onChange={(e) => onClassroomChange(e.target.value || undefined)}
            className={`${selectClass} min-w-0`}
            aria-label="Filtrar por aula"
          >
            <option value="">Todas las aulas</option>
            {classrooms.map((c) => (
              <option key={c.id} value={c.id}>
                {c.grade}° "{c.section}" · {formatEducationLevel(c.educationLevel)}
              </option>
            ))}
          </select>

          <select
            value={educationLevel || ''}
            onChange={(e) => onEducationLevelChange((e.target.value || undefined) as Level | undefined)}
            className={`${selectClass} min-w-0`}
            aria-label="Filtrar por nivel"
          >
            <option value="">Todos los niveles</option>
            <option value="INITIAL">Inicial</option>
            <option value="PRIMARY">Primaria</option>
            <option value="SECONDARY">Secundaria</option>
          </select>

          {onExportNomina && classroomId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onExportNomina(classroomId)}
              className="h-9 gap-1.5 text-emerald-700 dark:text-emerald-400"
              title="Descargar la nómina oficial SIAGIE (.xlsx) de esta aula"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Nómina del aula
            </Button>
          )}

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={onResetFilters} className="h-9 gap-1 text-muted-foreground">
              <X className="w-4 h-4" />
              Limpiar
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : students.length === 0 ? (
        hasFilters ? (
          <EmptyState
            icon={<Search className="w-8 h-8" />}
            title={search ? `Ningún alumno coincide con «${search}»` : 'Ningún alumno con estos filtros'}
            description="Prueba con otra palabra (nombre, apellido, DNI o código) o quita los filtros."
            action={
              <Button variant="outline" size="sm" onClick={onResetFilters}>
                Limpiar filtros
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={<Users className="w-8 h-8" />}
            title="Aún no hay alumnos en esta lista"
            description="Matricula al primero o cárgalos todos de una vez desde Excel o desde la nómina del SIAGIE."
            action={emptyAction}
          />
        )
      ) : (
        <div
          className={`rounded-xl border border-border bg-card shadow-sm overflow-hidden transition-opacity ${isFetching ? 'opacity-70' : ''}`}
        >
          {/* Escritorio: tabla */}
          <div className="hidden md:block">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="text-xs font-semibold">Alumno</TableHead>
                  <TableHead className="text-xs font-semibold">Aula</TableHead>
                  <TableHead className="text-xs font-semibold">Apoderados</TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <React.Fragment key={student.id}>
                    <TableRow className="hover:bg-muted/30">
                      <TableCell className="py-3">{nameBlock(student)}</TableCell>
                      <TableCell>{classroomCell(student)}</TableCell>
                      <TableCell>{guardiansButton(student)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1.5 text-primary"
                            onClick={() => setSelectedStudentForEdit(student)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Editar
                          </Button>
                          {rowMenu(student)}
                        </div>
                      </TableCell>
                    </TableRow>
                    {expandedStudentId === student.id && (
                      <TableRow>
                        <TableCell colSpan={4} className="p-0 bg-muted/20 border-t border-dashed border-border">
                          {parentsPanel(student)}
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Celular: tarjetas */}
          <ul className="divide-y divide-border md:hidden">
            {students.map((student) => (
              <li key={student.id} className="p-3">
                <div className="flex items-start justify-between gap-2">
                  {nameBlock(student)}
                  {rowMenu(student)}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {classroomCell(student)}
                  {guardiansButton(student)}
                </div>
                {expandedStudentId === student.id && (
                  <div className="-mx-3 mt-3 border-t border-dashed border-border bg-muted/20">
                    {parentsPanel(student)}
                  </div>
                )}
              </li>
            ))}
          </ul>

          {meta && (
            <Pagination
              currentPage={page}
              totalPages={meta.totalPages}
              totalItems={meta.total}
              limit={limit}
              onPageChange={onPageChange}
              onLimitChange={onLimitChange}
            />
          )}
        </div>
      )}

      <EditStudentModal
        student={selectedStudentForEdit}
        isOpen={!!selectedStudentForEdit}
        onClose={() => setSelectedStudentForEdit(null)}
      />

      <StudentFichaModal
        studentId={selectedStudentForFicha}
        isOpen={Boolean(selectedStudentForFicha)}
        onClose={() => setSelectedStudentForFicha(null)}
      />

      {selectedStudentForQr && (
        <StudentQrCardModal
          studentName={formatFullName(selectedStudentForQr, 'LAST_FIRST')}
          documentId={selectedStudentForQr.documentId}
          studentCode={selectedStudentForQr.studentCode}
          grade={rowInfo(selectedStudentForQr).classroom?.grade || ''}
          section={rowInfo(selectedStudentForQr).classroom?.section || ''}
          educationLevel={rowInfo(selectedStudentForQr).classroom?.educationLevel || ''}
          schoolName={school?.name}
          onClose={() => setSelectedStudentForQr(null)}
        />
      )}

      <WithdrawStudentModal target={withdrawTarget} onClose={() => setWithdrawTarget(null)} />

      {selectedStudentForCertificates && (
        <StudentCertificateModal
          isOpen
          studentId={selectedStudentForCertificates.id}
          studentName={formatFullName(selectedStudentForCertificates, 'LAST_FIRST')}
          onClose={() => setSelectedStudentForCertificates(null)}
        />
      )}

      {tempCredentials && (
        <TemporaryCredentialsDialog
          open
          onClose={() => setTempCredentials(null)}
          title="Contraseña restablecida"
          credentials={tempCredentials}
        />
      )}
    </div>
  );
};
