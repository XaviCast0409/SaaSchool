import React, { useState } from 'react';
import {
  CalendarCheck,
  Calendar as CalendarIcon,
  CheckCircle2,
  XCircle,
  Clock,
  School,
  Check,
  RotateCcw,
  Loader2,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Grid3X3,
  BarChart3,
} from 'lucide-react';
import { useAttendance, useUpdateAttendance } from '../api/useAttendance';
import { AttendanceStatusBadge } from '../components/AttendanceStatusBadge';
import { AttendanceMonthlyReport } from '../components/AttendanceMonthlyReport';
import { AttendanceMatrixGrid } from '../components/AttendanceMatrixGrid';
import { BulkAttendanceModal } from '../components/BulkAttendanceModal';
import { EditNotesModal } from '../components/EditNotesModal';
import { useClassrooms } from '@/features/classrooms/api/useClassrooms';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { AttendanceStatus, AttendanceRecord } from '../types';

const STATUS_OPTIONS: Array<{ value: AttendanceStatus; label: string; color: string }> = [
  { value: 'PRESENT', label: 'Presente', color: 'hover:bg-emerald-500/10 hover:text-emerald-600' },
  { value: 'ABSENT_UNJUSTIFIED', label: 'Falta Inj.', color: 'hover:bg-destructive/10 hover:text-destructive' },
  { value: 'ABSENT_JUSTIFIED', label: 'Falta Just.', color: 'hover:bg-amber-500/10 hover:text-amber-600' },
  { value: 'LATE_UNJUSTIFIED', label: 'Tardanza Inj.', color: 'hover:bg-amber-500/10 hover:text-amber-600' },
  { value: 'LATE_JUSTIFIED', label: 'Tardanza Just.', color: 'hover:bg-sky-500/10 hover:text-sky-600' },
];

function navigateMonth(currentMonthStr: string, delta: number): string {
  const [y, m] = currentMonthStr.split('-').map(Number);
  const date = new Date(y, m - 1 + delta, 1);
  const nextY = date.getFullYear();
  const nextM = String(date.getMonth() + 1).padStart(2, '0');
  return `${nextY}-${nextM}`;
}

export const AttendancePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'DAILY' | 'MATRIX' | 'MONTHLY'>('DAILY');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>('');
  const [editingAttendanceId, setEditingAttendanceId] = useState<string | null>(null);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [notesModalRecord, setNotesModalRecord] = useState<AttendanceRecord | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 50;

  // Queries
  const { data: classrooms = [] } = useClassrooms();
  const {
    data: paginatedResult,
    isLoading,
    isError,
    refetch,
  } = useAttendance({
    date: selectedDate,
    classroomId: selectedClassroomId || undefined,
    page: currentPage,
    limit: PAGE_SIZE,
  });

  const attendanceList = paginatedResult?.data ?? [];
  const meta = paginatedResult?.meta;

  const { mutate: updateAttendance, isPending: isUpdating } = useUpdateAttendance();

  // Metrics
  const total = attendanceList.length;
  const presentCount = attendanceList.filter((a) => a.status === 'PRESENT').length;
  const absentCount = attendanceList.filter((a) => a.status.startsWith('ABSENT')).length;
  const lateCount = attendanceList.filter((a) => a.status.startsWith('LATE')).length;
  const presentPct = total > 0 ? Math.round((presentCount / total) * 100) : 0;
  const absentPct = total > 0 ? Math.round((absentCount / total) * 100) : 0;
  const latePct = total > 0 ? Math.round((lateCount / total) * 100) : 0;

  const handleStatusChange = (attendanceId: string, newStatus: AttendanceStatus) => {
    setEditingAttendanceId(attendanceId);
    updateAttendance(
      { id: attendanceId, status: newStatus },
      {
        onSettled: () => setEditingAttendanceId(null),
      }
    );
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setCurrentPage(1);
  };

  const handleClassroomChange = (id: string) => {
    setSelectedClassroomId(id);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Control de Asistencia Escolar
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Registro diario, consulta de meses anteriores y exportación de Actas MINEDU.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
          {/* Tomar Asistencia Masiva Button */}
          <Button
            onClick={() => setIsBulkModalOpen(true)}
            className="gap-2 shadow-sm"
          >
            <UserCheck className="w-4 h-4" />
            <span>Tomar Asistencia del Aula</span>
          </Button>

          {/* Classroom & Date Selectors */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Classroom Selector */}
            <div className="flex items-center gap-1.5 bg-card p-1.5 rounded-lg border border-border">
              <School className="w-4 h-4 text-muted-foreground ml-1 shrink-0" />
              <select
                value={selectedClassroomId}
                onChange={(e) => handleClassroomChange(e.target.value)}
                className="h-8 border-none bg-transparent text-xs font-semibold focus-visible:ring-0 text-foreground cursor-pointer"
              >
                <option value="">— Todas las Secciones —</option>
                {classrooms.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.grade}° {c.section} ({c.educationLevel})
                  </option>
                ))}
              </select>
            </div>

            {/* Date or Month Picker with Previous/Next Navigation */}
            {activeTab === 'DAILY' ? (
              <div className="flex items-center gap-1.5 bg-card p-1.5 rounded-lg border border-border">
                <CalendarIcon className="w-4 h-4 text-muted-foreground ml-1 shrink-0" />
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="h-8 border-none bg-transparent text-xs font-semibold focus-visible:ring-0 w-36"
                />
              </div>
            ) : (
              <div className="flex items-center gap-1 bg-card p-1 rounded-lg border border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                  title="Mes Anterior"
                  onClick={() => setSelectedMonth((m) => navigateMonth(m, -1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="flex items-center gap-1 px-1">
                  <CalendarIcon className="w-4 h-4 text-primary shrink-0" />
                  <Input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="h-7 border-none bg-transparent text-xs font-bold focus-visible:ring-0 w-32 p-0 cursor-pointer"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                  title="Mes Siguiente"
                  onClick={() => setSelectedMonth((m) => navigateMonth(m, 1))}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-border overflow-x-auto">
        <button
          onClick={() => setActiveTab('DAILY')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap -mb-px ${
            activeTab === 'DAILY'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <CalendarCheck className="w-4 h-4" />
          <span>Control Diario ({selectedDate})</span>
        </button>

        <button
          onClick={() => setActiveTab('MATRIX')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap -mb-px ${
            activeTab === 'MATRIX'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Grid3X3 className="w-4 h-4 text-emerald-600" />
          <span>Sábana Mensual (Matriz 1..31)</span>
        </button>

        <button
          onClick={() => setActiveTab('MONTHLY')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap -mb-px ${
            activeTab === 'MONTHLY'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-sky-600" />
          <span>Reporte & KPIs ({selectedMonth})</span>
        </button>
      </div>

      {/* Tab 1: Control Diario */}
      {activeTab === 'DAILY' && (
        <div className="space-y-6">
          {/* KPI Cards con barra de progreso */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Presentes</CardTitle>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {presentCount}
                  {total > 0 && (
                    <span className="ml-1.5 text-sm font-normal text-muted-foreground">
                      ({presentPct}%)
                    </span>
                  )}
                </div>
                <div className="mt-2 w-full bg-muted rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${presentPct}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">de {total} alumnos registrados</p>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Faltas</CardTitle>
                <XCircle className="w-4 h-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                  {absentCount}
                  {total > 0 && (
                    <span className="ml-1.5 text-sm font-normal text-muted-foreground">
                      ({absentPct}%)
                    </span>
                  )}
                </div>
                <div className="mt-2 w-full bg-muted rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-destructive h-full rounded-full transition-all duration-500"
                    style={{ width: `${absentPct}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Justificadas e Injustificadas</p>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Tardanzas</CardTitle>
                <Clock className="w-4 h-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {lateCount}
                  {total > 0 && (
                    <span className="ml-1.5 text-sm font-normal text-muted-foreground">
                      ({latePct}%)
                    </span>
                  )}
                </div>
                <div className="mt-2 w-full bg-muted rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${latePct}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Justificadas e Injustificadas</p>
              </CardContent>
            </Card>
          </div>

          {/* Attendance Table */}
          {!selectedClassroomId ? (
            <div className="py-16 text-center text-muted-foreground border border-dashed border-border rounded-xl space-y-3 bg-card p-6">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <School className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-base text-foreground">Selecciona una Sección Educativa</h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Para optimizar el rendimiento y evitar tráfico masivo en el sistema, por favor selecciona un Aula/Sección en el desplegable superior para consultar la asistencia diaria.
                </p>
              </div>
            </div>
          ) : isLoading ? (
            <Skeleton className="h-64 w-full rounded-md" />
          ) : isError ? (
            <div className="p-6 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-center space-y-3">
              <p className="font-semibold">Error al cargar la asistencia.</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Reintentar
              </Button>
            </div>
          ) : (
            <>
              <div className="rounded-md border border-border bg-card shadow-sm overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="text-xs font-bold uppercase">Estudiante</TableHead>
                      <TableHead className="text-xs font-bold uppercase">Sección</TableHead>
                      <TableHead className="text-xs font-bold uppercase">Estado Actual</TableHead>
                      <TableHead className="text-xs font-bold uppercase">Observaciones</TableHead>
                      <TableHead className="text-xs font-bold uppercase">Corregir / Cambiar Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceList.length ? (
                      attendanceList.map((item) => {
                        const student = item.enrollment?.student;
                        const classroom = item.enrollment?.classroom;
                        const isItemUpdating = isUpdating && editingAttendanceId === item.id;

                        return (
                          <TableRow key={item.id} className="hover:bg-muted/20">
                            <TableCell>
                              <div className="font-semibold text-foreground">
                                {student
                                  ? `${student.lastNamePaternal} ${student.lastNameMaternal}, ${student.firstNames}`
                                  : 'Estudiante'}
                              </div>
                            </TableCell>

                            <TableCell className="text-xs text-muted-foreground">
                              {classroom ? `${classroom.grade}° ${classroom.section}` : '—'}
                            </TableCell>

                            <TableCell>
                              <AttendanceStatusBadge status={item.status} />
                            </TableCell>

                            <TableCell>
                              <button
                                onClick={() => setNotesModalRecord(item)}
                                className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded border transition-colors ${
                                  item.notes
                                    ? 'border-primary/40 bg-primary/5 text-primary hover:bg-primary/10'
                                    : 'border-border text-muted-foreground hover:border-primary/30 hover:text-foreground'
                                }`}
                                title={item.notes || 'Sin observaciones'}
                              >
                                <MessageSquare className="w-3 h-3" />
                                <span className="max-w-[120px] truncate">
                                  {item.notes || 'Agregar nota'}
                                </span>
                              </button>
                            </TableCell>

                            <TableCell>
                              <div className="flex items-center gap-1 flex-wrap">
                                {STATUS_OPTIONS.map((opt) => {
                                  const isSelected = item.status === opt.value;
                                  return (
                                    <button
                                      key={opt.value}
                                      disabled={isItemUpdating}
                                      onClick={() => handleStatusChange(item.id, opt.value)}
                                      className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
                                        isSelected
                                          ? 'bg-primary text-primary-foreground border-primary font-semibold'
                                          : `border-border bg-background text-muted-foreground ${opt.color}`
                                      }`}
                                    >
                                      {isItemUpdating && isSelected ? (
                                        <Loader2 className="w-3 h-3 animate-spin inline mr-1" />
                                      ) : isSelected ? (
                                        <Check className="w-3 h-3 inline mr-0.5" />
                                      ) : null}
                                      {opt.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <RotateCcw className="w-8 h-8 text-muted-foreground/50" />
                            <span>No hay asistencia registrada para la fecha ({selectedDate}).</span>
                            <p className="text-xs text-muted-foreground/70">
                              Usa el botón "Tomar Asistencia del Aula" para registrar la asistencia del día.
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {meta && meta.totalPages > 1 && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Mostrando {(meta.page - 1) * meta.limit + 1}–
                    {Math.min(meta.page * meta.limit, meta.total)} de {meta.total} registros
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => p - 1)}
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </Button>
                    <span className="px-2 font-medium">
                      Pág. {meta.page} / {meta.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0"
                      disabled={currentPage >= meta.totalPages}
                      onClick={() => setCurrentPage((p) => p + 1)}
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Tab 2: Sábana Mensual (Matriz 1..31) */}
      {activeTab === 'MATRIX' && (
        <AttendanceMatrixGrid
          initialMonth={selectedMonth}
          initialClassroomId={selectedClassroomId}
        />
      )}

      {/* Tab 3: Reporte & KPIs */}
      {activeTab === 'MONTHLY' && (
        <AttendanceMonthlyReport
          month={selectedMonth}
          classroomId={selectedClassroomId || undefined}
        />
      )}

      {/* Modal de Toma Masiva de Asistencia por Aula */}
      {isBulkModalOpen && (
        <BulkAttendanceModal
          initialClassroomId={selectedClassroomId}
          initialDate={selectedDate}
          onClose={() => setIsBulkModalOpen(false)}
        />
      )}

      {/* Modal de edición de notas/justificación */}
      {notesModalRecord && (
        <EditNotesModal
          record={notesModalRecord}
          onClose={() => setNotesModalRecord(null)}
        />
      )}
    </div>
  );
};
