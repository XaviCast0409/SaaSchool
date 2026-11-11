import React, { useState, useEffect, useMemo } from 'react';
import {
  ClipboardCheck,
  Calendar as CalendarIcon,
  Clock,
  BookOpen,
  Info,
  Check,
  Save,
  Loader2,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/useAuthStore';
import {
  useCourseAssignments,
  useMyCourseAssignments,
} from '@/features/course-assignments/api/useCourseAssignments';
import {
  useCourseAttendanceSession,
  useSaveCourseAttendanceSession,
  useCourseAttendanceSummary,
  CourseAttendanceStatus,
} from '../api/useCourseAttendance';
import { getPeruToday, getPeruCurrentMonth, formatPeruTime } from '@/lib/dateUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const PERIOD_LABELS = [
  { value: '1', label: '1.ª hora' },
  { value: '2', label: '2.ª hora' },
  { value: '3', label: '3.ª hora' },
  { value: '4', label: '4.ª hora' },
  { value: '5', label: '5.ª hora' },
  { value: '6', label: '6.ª hora' },
  { value: '7', label: '7.ª hora' },
  { value: '8', label: '8.ª hora' },
];

interface LocalStudentRow {
  enrollmentId: string;
  fullName: string;
  documentId: string;
  studentCode: string | null;
  status: CourseAttendanceStatus;
  note: string;
  dailyStatus: string | null;
}

export const CourseAttendancePage: React.FC = () => {
  const { user } = useAuthStore();
  const isTeacher = user?.role === 'TEACHER';

  // Cursos según rol
  const { data: teacherAssignments, isLoading: loadingMyAssignments } = useMyCourseAssignments({
    enabled: isTeacher,
  });
  const { data: adminAssignments, isLoading: loadingAllAssignments } = useCourseAssignments({
    enabled: !isTeacher,
  });

  const assignments = useMemo(() => {
    return isTeacher ? teacherAssignments || [] : adminAssignments || [];
  }, [isTeacher, teacherAssignments, adminAssignments]);

  const assignmentsLoading = isTeacher ? loadingMyAssignments : loadingAllAssignments;

  // Estados de filtros
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(getPeruToday());
  const [selectedPeriod, setSelectedPeriod] = useState<string>('1');
  const [selectedMonth, setSelectedMonth] = useState<string>(getPeruCurrentMonth());
  const [activeTab, setActiveTab] = useState<'session' | 'summary'>('session');

  // Seleccionar automáticamente el primer curso si no hay seleccionado
  useEffect(() => {
    if (!selectedAssignmentId && assignments.length > 0) {
      setSelectedAssignmentId(assignments[0].id);
    }
  }, [assignments, selectedAssignmentId]);

  // Sesión actual
  const {
    data: sessionData,
    isLoading: loadingSession,
    isFetching: fetchingSession,
  } = useCourseAttendanceSession({
    courseAssignmentId: selectedAssignmentId || undefined,
    date: selectedDate,
    periodLabel: selectedPeriod,
  });

  // Estado local para los registros editables
  const [studentRows, setStudentRows] = useState<LocalStudentRow[]>([]);

  useEffect(() => {
    if (sessionData?.students) {
      setStudentRows(
        sessionData.students.map((s) => ({
          enrollmentId: s.enrollmentId,
          fullName: s.fullName,
          documentId: s.documentId,
          studentCode: s.studentCode,
          status: s.status,
          note: s.note || '',
          dailyStatus: s.dailyStatus,
        })),
      );
    } else {
      setStudentRows([]);
    }
  }, [sessionData]);

  // Resumen del mes
  const { data: summaryData, isLoading: loadingSummary } = useCourseAttendanceSummary({
    courseAssignmentId: selectedAssignmentId || undefined,
    month: selectedMonth,
  });

  const saveMutation = useSaveCourseAttendanceSession();

  const handleStatusChange = (enrollmentId: string, newStatus: CourseAttendanceStatus) => {
    setStudentRows((prev) =>
      prev.map((r) => (r.enrollmentId === enrollmentId ? { ...r, status: newStatus } : r)),
    );
  };

  const handleNoteChange = (enrollmentId: string, note: string) => {
    setStudentRows((prev) =>
      prev.map((r) => (r.enrollmentId === enrollmentId ? { ...r, note } : r)),
    );
  };

  const handleMarkAllPresent = () => {
    setStudentRows((prev) => prev.map((r) => ({ ...r, status: 'PRESENT' })));
    toast.info('Se marcaron todos los estudiantes como presentes');
  };

  const handleSave = async () => {
    if (!selectedAssignmentId || !selectedDate) {
      toast.error('Selecciona un curso y una fecha.');
      return;
    }
    if (studentRows.length === 0) {
      toast.error('No hay estudiantes en el aula para registrar.');
      return;
    }

    try {
      await saveMutation.mutateAsync({
        courseAssignmentId: selectedAssignmentId,
        date: selectedDate,
        periodLabel: selectedPeriod,
        records: studentRows.map((r) => ({
          enrollmentId: r.enrollmentId,
          status: r.status,
          note: r.note.trim() || null,
        })),
      });
      toast.success('Asistencia guardada correctamente.');
    } catch {
      toast.error('Error al guardar la asistencia por curso.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner de aviso legal y metodológico */}
      <div className="flex items-start gap-3 rounded-lg border border-sky-200 bg-sky-50/80 p-4 text-sky-900 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-200">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-sky-600 dark:text-sky-400" />
        <div className="text-sm">
          <p className="font-semibold">Registro interno del docente</p>
          <p className="text-sky-800 dark:text-sky-300">
            La asistencia oficial que se reporta al SIAGIE es la del ingreso diario al colegio.
          </p>
        </div>
      </div>

      {/* Cabecera y Selector de Pestañas */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ClipboardCheck className="h-7 w-7 text-primary" />
            Asistencia por Curso
          </h1>
          <p className="text-sm text-muted-foreground">
            Control de asistencia por hora pedagógica para tus cursos asignados.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={activeTab === 'session' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('session')}
            className="gap-2"
          >
            <Clock className="h-4 w-4" />
            Registro por Sesión
          </Button>
          <Button
            variant={activeTab === 'summary' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('summary')}
            className="gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            Resumen del Mes
          </Button>
        </div>
      </div>

      {/* Barra de Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Filtro: Curso */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5" />
                Curso / Aula
              </label>
              {assignmentsLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : assignments.length === 0 ? (
                <div className="rounded-md border border-dashed border-border p-2 text-xs text-muted-foreground">
                  No tienes cursos asignados.
                </div>
              ) : (
                <select
                  value={selectedAssignmentId}
                  onChange={(e) => setSelectedAssignmentId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {assignments.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.area.name} — {c.classroom.grade}° &quot;{c.classroom.section}&quot;
                    </option>
                  ))}
                </select>
              )}
            </div>

            {activeTab === 'session' ? (
              <>
                {/* Filtro: Fecha */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    Fecha
                  </label>
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="h-10"
                  />
                </div>

                {/* Filtro: Hora pedagógica */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Hora
                  </label>
                  <select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {PERIOD_LABELS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              /* Filtro: Mes para resumen */
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  Mes
                </label>
                <Input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="h-10"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Vista de Registro por Sesión */}
      {activeTab === 'session' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
            <div className="space-y-1">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <span>Lista de Estudiantes</span>
                {sessionData?.sessionExists && sessionData.updatedAt && (
                  <Badge variant="outline" className="gap-1 border-emerald-500/30 text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20">
                    <CheckCircle2 className="h-3 w-3" />
                    Guardado ({formatPeruTime(new Date(sessionData.updatedAt))})
                  </Badge>
                )}
                {fetchingSession && !loadingSession && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Total en aula: {studentRows.length} alumnos
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllPresent}
                disabled={studentRows.length === 0 || loadingSession}
                className="gap-1.5"
              >
                <Check className="h-4 w-4 text-emerald-600" />
                Todos presentes
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={studentRows.length === 0 || loadingSession || saveMutation.isPending}
                className="gap-1.5"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Guardar asistencia
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {loadingSession ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : studentRows.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <AlertTriangle className="mx-auto h-8 w-8 text-amber-500 mb-2" />
                <p className="font-medium">No se encontraron estudiantes para este curso y fecha.</p>
                <p className="text-xs">Verifica que el aula tenga matrículas activas en el año lectivo vigente.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-center">N.°</TableHead>
                      <TableHead>Estudiante</TableHead>
                      <TableHead className="w-48 text-center">Asistencia</TableHead>
                      <TableHead className="w-64">Observación (opcional)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentRows.map((row, index) => {
                      const isAbsentDaily = row.dailyStatus?.startsWith('ABSENT_');
                      const isPresent = row.status === 'PRESENT';
                      const isLate =
                        row.status === 'LATE_UNJUSTIFIED' || row.status === 'LATE_JUSTIFIED';
                      const isAbsent =
                        row.status === 'ABSENT_UNJUSTIFIED' || row.status === 'ABSENT_JUSTIFIED';

                      return (
                        <TableRow key={row.enrollmentId}>
                          <TableCell className="text-center font-mono text-xs text-muted-foreground">
                            {index + 1}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-foreground">{row.fullName}</div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>DNI: {row.documentId}</span>
                              {isAbsentDaily && (
                                <Badge
                                  variant="destructive"
                                  className="h-5 text-[10px] px-1.5 py-0 uppercase font-semibold"
                                >
                                  Faltó al colegio
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {/* Segmented Control */}
                            <div
                              role="group"
                              aria-label={`Asistencia de ${row.fullName}`}
                              className="inline-flex rounded-lg border border-border p-1 bg-muted/40"
                            >
                              <button
                                type="button"
                                aria-label="Presente"
                                aria-pressed={isPresent}
                                onClick={() => handleStatusChange(row.enrollmentId, 'PRESENT')}
                                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                                  isPresent
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                                }`}
                              >
                                P
                              </button>
                              <button
                                type="button"
                                aria-label="Tardanza"
                                aria-pressed={isLate}
                                onClick={() =>
                                  handleStatusChange(row.enrollmentId, 'LATE_UNJUSTIFIED')
                                }
                                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                                  isLate
                                    ? 'bg-amber-500 text-white shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                                }`}
                              >
                                T
                              </button>
                              <button
                                type="button"
                                aria-label="Falta"
                                aria-pressed={isAbsent}
                                onClick={() =>
                                  handleStatusChange(row.enrollmentId, 'ABSENT_UNJUSTIFIED')
                                }
                                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                                  isAbsent
                                    ? 'bg-rose-600 text-white shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                                }`}
                              >
                                F
                              </button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="text"
                              placeholder="Nota breve..."
                              value={row.note}
                              maxLength={200}
                              onChange={(e) => handleNoteChange(row.enrollmentId, e.target.value)}
                              className="h-8 text-xs"
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Vista de Resumen del Mes */}
      {activeTab === 'summary' && (
        <Card>
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <span>Resumen de Asistencia Mensual ({selectedMonth})</span>
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Total de sesiones dictadas en el mes:{' '}
              <span className="font-semibold text-foreground">
                {summaryData?.totalSessions || 0}
              </span>
            </p>
          </CardHeader>
          <CardContent className="p-0">
            {loadingSummary ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !summaryData || summaryData.summary.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                No hay sesiones registradas para este curso en el mes seleccionado.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-center">N.°</TableHead>
                      <TableHead>Alumno</TableHead>
                      <TableHead className="text-center font-semibold text-emerald-600">
                        Presentes
                      </TableHead>
                      <TableHead className="text-center font-semibold text-amber-600">
                        Tardanzas
                      </TableHead>
                      <TableHead className="text-center font-semibold text-rose-600">
                        Faltas
                      </TableHead>
                      <TableHead className="text-center font-semibold">
                        % Asistencia
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summaryData.summary.map((row, index) => (
                      <TableRow key={row.enrollmentId}>
                        <TableCell className="text-center font-mono text-xs text-muted-foreground">
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-foreground">{row.fullName}</div>
                          <div className="text-xs text-muted-foreground">DNI: {row.documentId}</div>
                        </TableCell>
                        <TableCell className="text-center font-semibold text-emerald-600">
                          {row.presents}
                        </TableCell>
                        <TableCell className="text-center font-semibold text-amber-600">
                          {row.lates}
                        </TableCell>
                        <TableCell className="text-center font-semibold text-rose-600">
                          {row.absences}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={row.attendancePercent >= 85 ? 'outline' : 'destructive'}
                            className="font-mono text-xs"
                          >
                            {row.attendancePercent}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CourseAttendancePage;
