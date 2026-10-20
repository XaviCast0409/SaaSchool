import React, { useState } from 'react';
import {
  CalendarCheck,
  Calendar as CalendarIcon,
  CheckCircle2,
  XCircle,
  Clock,
  School,
  Check,
  Loader2,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Grid3X3,
  BarChart3,
  QrCode,
  Search,
  X,
  Sliders,
} from 'lucide-react';
import { useAttendance, useUpdateAttendance } from '../api/useAttendance';
import { AttendanceStatusBadge } from '../components/AttendanceStatusBadge';
import { AttendanceMonthlyReport } from '../components/AttendanceMonthlyReport';
import { AttendanceMatrixGrid } from '../components/AttendanceMatrixGrid';
import { BulkAttendanceModal } from '../components/BulkAttendanceModal';
import { EditNotesModal } from '../components/EditNotesModal';
import { QrScannerModal } from '../components/QrScannerModal';
import { AttendanceSheetView } from '../components/AttendanceSheetView';
import { AttendanceScheduleModal } from '../components/AttendanceScheduleModal';
import { useClassrooms } from '@/features/classrooms/api/useClassrooms';
import { useAuthStore } from '@/store/useAuthStore';
import { getPeruToday, getPeruCurrentMonth, formatPeruTime, formatPeruDate } from '@/lib/dateUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { AttendanceStatus, AttendanceRecord } from '../types';

import { ParentAttendanceView } from '@/features/parent/components/ParentAttendanceView';

const STATUS_OPTIONS: Array<{ value: AttendanceStatus; label: string; color: string }> = [
  { value: 'PRESENT', label: 'Presente', color: 'hover:bg-emerald-500/10 hover:text-emerald-600' },
  { value: 'ABSENT_UNJUSTIFIED', label: 'Falta Inj.', color: 'hover:bg-destructive/10 hover:text-destructive' },
  { value: 'ABSENT_JUSTIFIED', label: 'Falta Just.', color: 'hover:bg-amber-500/10 hover:text-amber-600' },
  { value: 'LATE_UNJUSTIFIED', label: 'Tardanza Inj.', color: 'hover:bg-amber-500/10 hover:text-amber-600' },
  { value: 'LATE_JUSTIFIED', label: 'Tardanza Just.', color: 'hover:bg-sky-500/10 hover:text-sky-600' },
];

export const AttendancePage: React.FC = () => {
  const user = useAuthStore((state) => state.user);

  // Si el usuario es PADRE / APODERADO, mostrar la vista especializada de su hijo
  if (user?.role === 'PARENT') {
    return <ParentAttendanceView />;
  }

  const [activeTab, setActiveTab] = useState<'DAILY' | 'MATRIX' | 'MONTHLY'>('DAILY');
  const [dailyViewMode, setDailyViewMode] = useState<'SHEET' | 'LOG'>('SHEET');
  const [selectedDate, setSelectedDate] = useState<string>(getPeruToday());
  const selectedMonth = getPeruCurrentMonth();
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>('');
  const [editingAttendanceId, setEditingAttendanceId] = useState<string | null>(null);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ABSENT' | 'LATE' | 'PRESENT'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [notesModalRecord, setNotesModalRecord] = useState<AttendanceRecord | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const isTeacher = user?.role === 'TEACHER';
  const canConfigureSchedule = user?.role === 'SUPER_ADMIN' || user?.role === 'SCHOOL_ADMIN' || user?.role === 'ADMINISTRATIVE';

  // Queries
  const { data: classrooms = [] } = useClassrooms();
  const tutoredClassrooms = isTeacher
    ? classrooms.filter((c) => c.tutorTeacherId === user?.id || c.tutorTeacher?.id === user?.id)
    : [];
  const isTutor = tutoredClassrooms.length > 0;
  const canWriteAttendance = !isTeacher || (isTutor && tutoredClassrooms.some((c) => c.id === selectedClassroomId));

  // Auto-seleccionar aula del tutor
  React.useEffect(() => {
    if (isTeacher && isTutor && !selectedClassroomId) {
      setSelectedClassroomId(tutoredClassrooms[0].id);
    }
  }, [isTeacher, isTutor, tutoredClassrooms, selectedClassroomId]);
  const {
    data: paginatedResult,
    isLoading,
    isError,
    refetch,
  } = useAttendance({
    date: selectedDate,
    classroomId: selectedClassroomId || undefined,
    status: statusFilter,
    search: searchTerm || undefined,
    page: currentPage,
    limit: pageSize,
  });

  const attendanceList = paginatedResult?.data ?? [];
  const meta = paginatedResult?.meta;
  const stats = paginatedResult?.stats;

  // Mostramos directamente la lista paginada del backend
  const displayedAttendance = attendanceList;

  const { mutate: updateAttendance, isPending: isUpdating } = useUpdateAttendance();

  // Metrics exactas de todo el día/aula desde el backend
  const total = stats?.total ?? meta?.total ?? attendanceList.length;
  const presentCount = stats?.present ?? 0;
  const absentCount = stats?.absent ?? 0;
  const lateCount = stats?.late ?? 0;
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
    <div className="space-y-6">      {/* Header */}
      <div className="p-5 sm:p-7 rounded-2xl bg-card border border-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Badge className="bg-primary/10 text-primary border-primary/20 gap-1 text-[11px] font-bold">
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>Control de Asistencia Escolar</span>
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
            Asistencia y Puntualidad
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Pase de lista diario, consulta mensual y exportación oficial para Actas SIAGIE.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
          {/* Lector QR / Kiosco en Puerta */}
          <Button
            onClick={() => setIsQrScannerOpen(true)}
            className="gap-2 shadow-sm bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl h-10 px-4"
          >
            <QrCode className="w-4 h-4" />
            <span>Lector QR</span>
          </Button>

          {/* Configuración de Horarios & Auto-Cierre */}
          {canConfigureSchedule && (
            <Button
              variant="outline"
              onClick={() => setIsScheduleModalOpen(true)}
              className="gap-2 shadow-sm rounded-xl h-10 px-4 font-bold border-border hover:bg-accent"
              title="Configurar horarios de entrada, tardanza y auto-cierre"
            >
              <Sliders className="w-4 h-4 text-primary" />
              <span>Horarios y Cierre</span>
            </Button>
          )}

          {/* Tomar Asistencia Masiva Button */}
          <Button
            variant="outline"
            onClick={() => setIsBulkModalOpen(true)}
            disabled={isTeacher && !isTutor}
            className="gap-2 shadow-sm rounded-xl h-10 px-4 font-bold"
          >
            <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Tomar Asistencia del Aula</span>
          </Button>
        </div>
      </div>

      {/* Banner Informativo de Tutoría para Docentes */}
      {isTeacher && isTutor && (
        <div className="flex items-center gap-3.5 p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 text-xs text-foreground">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
            <School className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-foreground text-sm">
              Docente Tutor Asignado: {tutoredClassrooms[0]?.grade}° "{tutoredClassrooms[0]?.section}" ({tutoredClassrooms[0]?.educationLevel === 'PRIMARY' ? 'Primaria' : tutoredClassrooms[0]?.educationLevel === 'SECONDARY' ? 'Secundaria' : 'Inicial'})
            </p>
            <p className="text-muted-foreground text-xs mt-0.5">
              Tienes autorización para pasar lista, registrar justificaciones y gestionar la asistencia de tu aula.
            </p>
          </div>
        </div>
      )}

      {isTeacher && !isTutor && (
        <div className="flex items-center gap-3.5 p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-xs text-foreground">
          <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-amber-700 dark:text-amber-300 text-sm">
              Perfil Docente — Sin Aula de Tutoría Asignada
            </p>
            <p className="text-muted-foreground text-xs mt-0.5">
              En este colegio, el control y toma de asistencia general está asignado a los <strong>Docentes Tutores</strong> de cada sección y a la <strong>Administración</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-border overflow-x-auto">
        <button
          onClick={() => setActiveTab('DAILY')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap -mb-px ${activeTab === 'DAILY'
            ? 'border-primary text-primary font-bold'
            : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
        >
          <CalendarCheck className="w-4 h-4" />
          <span>Control Diario</span>
        </button>

        <button
          onClick={() => setActiveTab('MATRIX')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap -mb-px ${activeTab === 'MATRIX'
            ? 'border-primary text-primary font-bold'
            : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
        >
          <Grid3X3 className="w-4 h-4 text-emerald-600" />
          <span>Asistencia por Días</span>
        </button>

        <button
          onClick={() => setActiveTab('MONTHLY')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap -mb-px ${activeTab === 'MONTHLY'
            ? 'border-primary text-primary font-bold'
            : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
        >
          <BarChart3 className="w-4 h-4 text-sky-600" />
          <span>Reporte & KPIs</span>
        </button>
      </div>

      {/* Tab 1: Control Diario */}
      {activeTab === 'DAILY' && (
        <div className="space-y-6">
          {/* Barra de Control Principal: Fecha, Aula y Alternador de Modo */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border shadow-xs">
            <div className="flex flex-wrap items-center gap-3">
              {/* Selector de Fecha */}
              <div className="flex items-center gap-2 bg-background px-3 h-10 rounded-xl border border-input shadow-xs">
                <CalendarIcon className="w-4 h-4 text-primary shrink-0" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="bg-transparent border-none text-xs font-semibold focus:outline-none text-foreground cursor-pointer"
                />
                <span className="text-[11px] font-semibold text-muted-foreground hidden md:inline border-l border-border pl-2 capitalize">
                  {formatPeruDate(selectedDate, { weekday: 'short', day: 'numeric', month: 'short' })}
                </span>
              </div>

              {/* Selector de Aula */}
              <div className="flex items-center gap-2 bg-background px-3 h-10 rounded-xl border border-input shadow-xs min-w-[240px]">
                <School className="w-4 h-4 text-primary shrink-0" />
                <select
                  value={selectedClassroomId}
                  onChange={(e) => handleClassroomChange(e.target.value)}
                  className="w-full border-none bg-transparent text-xs font-semibold focus:outline-none text-foreground cursor-pointer"
                  disabled={isTeacher && tutoredClassrooms.length === 1}
                >
                  <option value="">— Todas las Aulas / Secciones —</option>
                  {(isTeacher && isTutor ? tutoredClassrooms : classrooms).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.grade}° "{c.section}" — {c.educationLevel === 'PRIMARY' ? 'Primaria' : c.educationLevel === 'SECONDARY' ? 'Secundaria' : 'Inicial'}
                      {c.tutorTeacherId === user?.id ? ' • Su Aula Tutoriada' : isTeacher && !isTutor ? ' (Consulta)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Alternador de Modo de Vista cuando hay aula seleccionada */}
            {selectedClassroomId && (
              <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setDailyViewMode('SHEET')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    dailyViewMode === 'SHEET'
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5 text-primary" />
                  <span>Hoja de Pase de Lista</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDailyViewMode('LOG')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    dailyViewMode === 'LOG'
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <CalendarCheck className="w-3.5 h-3.5" />
                  <span>Registro y Auditoría</span>
                </button>
              </div>
            )}
          </div>

          {/* VISTA A: Hoja Interactiva Directa de Pase de Lista */}
          {selectedClassroomId && dailyViewMode === 'SHEET' ? (
            <AttendanceSheetView
              classroomId={selectedClassroomId}
              date={selectedDate}
              canWrite={canWriteAttendance}
            />
          ) : (
            <div className="space-y-6">
              {!selectedClassroomId && (
                <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 text-xs text-muted-foreground flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-primary shrink-0" />
                    <span>
                      Estás viendo el <strong>registro global de todo el colegio</strong>. Selecciona un aula arriba para activar el pase de lista directo en pantalla.
                    </span>
                  </div>
                </div>
              )}

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

              {/* Barra de Búsqueda y Filtros de Estado */}
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-3 rounded-xl bg-card border border-border">
                {/* Buscador de Alumno / DNI */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Buscar alumno por nombre o DNI en el registro..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-9 pr-8 h-9 text-xs bg-background"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        setCurrentPage(1);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      title="Limpiar búsqueda"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Botones de Filtro Rápido por Estado */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Button
                    size="sm"
                    variant={statusFilter === 'ALL' ? 'default' : 'outline'}
                    className="h-8 text-xs font-semibold"
                    onClick={() => {
                      setStatusFilter('ALL');
                      setCurrentPage(1);
                    }}
                  >
                    Todos ({total})
                  </Button>
                  <Button
                    size="sm"
                    variant={statusFilter === 'ABSENT' ? 'default' : 'outline'}
                    className={`h-8 text-xs font-semibold ${statusFilter === 'ABSENT'
                      ? 'bg-destructive text-destructive-foreground'
                      : 'text-destructive hover:bg-destructive/10'
                      }`}
                    onClick={() => {
                      setStatusFilter('ABSENT');
                      setCurrentPage(1);
                    }}
                  >
                    Solo Faltas ({absentCount})
                  </Button>
                  <Button
                    size="sm"
                    variant={statusFilter === 'LATE' ? 'default' : 'outline'}
                    className={`h-8 text-xs font-semibold ${statusFilter === 'LATE'
                      ? 'bg-amber-600 text-white'
                      : 'text-amber-600 hover:bg-amber-500/10'
                      }`}
                    onClick={() => {
                      setStatusFilter('LATE');
                      setCurrentPage(1);
                    }}
                  >
                    Solo Tardanzas ({lateCount})
                  </Button>
                  <Button
                    size="sm"
                    variant={statusFilter === 'PRESENT' ? 'default' : 'outline'}
                    className={`h-8 text-xs font-semibold ${statusFilter === 'PRESENT'
                      ? 'bg-emerald-600 text-white'
                      : 'text-emerald-600 hover:bg-emerald-500/10'
                      }`}
                    onClick={() => {
                      setStatusFilter('PRESENT');
                      setCurrentPage(1);
                    }}
                  >
                    Solo Presentes ({presentCount})
                  </Button>
                </div>
              </div>

          {/* Attendance Table */}
          {isLoading ? (
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
                      <TableHead className="text-xs font-bold uppercase">Hora Ingreso</TableHead>
                      <TableHead className="text-xs font-bold uppercase">Estado Actual</TableHead>
                      <TableHead className="text-xs font-bold uppercase">Observaciones</TableHead>
                      <TableHead className="text-xs font-bold uppercase">Corregir / Cambiar Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedAttendance.length ? (
                      displayedAttendance.map((item) => {
                        const student = item.enrollment?.student;
                        const classroom = item.enrollment?.classroom;
                        const isItemUpdating = isUpdating && editingAttendanceId === item.id;

                        return (
                          <TableRow key={item.id} className="hover:bg-muted/20">
                            <TableCell>
                              <div className="font-semibold text-foreground">
                                {student
                                  ? `${student.lastNamePaternal} ${student.lastNameMaternal || ''}, ${student.firstNames}`
                                  : 'Estudiante'}
                              </div>
                            </TableCell>

                            <TableCell className="text-xs text-muted-foreground">
                              {classroom ? `${classroom.grade}° ${classroom.section}` : '—'}
                            </TableCell>

                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                              {item.checkInTime ? (
                                <div className="flex items-center gap-1 font-semibold text-foreground">
                                  <Clock className="w-3.5 h-3.5 text-primary" />
                                  <span>{formatPeruTime(item.checkInTime)}</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground/60">—</span>
                              )}
                            </TableCell>

                            <TableCell>
                              <AttendanceStatusBadge status={item.status} />
                            </TableCell>

                            <TableCell>
                              <button
                                onClick={() => setNotesModalRecord(item)}
                                className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded border transition-colors ${item.notes
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
                                      className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${isSelected
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
                        <TableCell colSpan={6} className="h-44 text-center text-muted-foreground p-6">
                          <div className="flex flex-col items-center justify-center gap-2 max-w-md mx-auto">
                            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                              <CalendarCheck className="w-5 h-5" />
                            </div>
                            {searchTerm ? (
                              <span className="font-semibold text-foreground text-sm">
                                No se encontraron alumnos para "{searchTerm}".
                              </span>
                            ) : statusFilter !== 'ALL' ? (
                              <span className="font-semibold text-foreground text-sm">
                                No se encontraron registros con el estado seleccionado para la fecha ({selectedDate}).
                              </span>
                            ) : (
                              <>
                                <span className="font-bold text-foreground text-sm">
                                  No hay asistencia registrada para la fecha ({selectedDate}).
                                </span>
                                <p className="text-xs text-muted-foreground">
                                  {isTeacher && !isTutor
                                    ? 'En esta fecha aún no se ha registrado la asistencia. La toma de asistencia general la realiza el docente tutor o personal administrativo.'
                                    : 'Aún no se ha registrado la lista de asistencia para esta fecha. Puedes registrar la asistencia del aula con un solo clic.'}
                                </p>
                                {(!isTeacher || isTutor) && (
                                  <Button
                                    size="sm"
                                    onClick={() => setIsBulkModalOpen(true)}
                                    className="gap-2 mt-2 font-bold shadow-sm"
                                  >
                                    <UserCheck className="w-4 h-4" />
                                    <span>Tomar Asistencia de Esta Fecha</span>
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {meta && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground px-1 py-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span>
                      Mostrando{' '}
                      <span className="font-semibold text-foreground">
                        {meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1}
                      </span>
                      {' '}–{' '}
                      <span className="font-semibold text-foreground">
                        {Math.min(meta.page * meta.limit, meta.total)}
                      </span>
                      {' '}de{' '}
                      <span className="font-semibold text-foreground">{meta.total}</span> alumnos
                    </span>

                    <div className="flex items-center gap-1.5 ml-2">
                      <span>Filas por pág:</span>
                      <select
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="h-7 px-2 border rounded-md bg-card border-border text-xs font-semibold text-foreground cursor-pointer"
                      >
                        <option value={10}>10</option>
                        <option value={15}>15</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                      </select>
                    </div>
                  </div>

                  {meta.totalPages > 1 && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2.5 text-xs gap-1"
                        disabled={currentPage <= 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>Anterior</span>
                      </Button>
                      <span className="px-3 font-semibold text-foreground">
                        Pág. {meta.page} / {meta.totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2.5 text-xs gap-1"
                        disabled={currentPage >= meta.totalPages}
                        onClick={() => setCurrentPage((p) => Math.min(meta.totalPages, p + 1))}
                      >
                        <span>Siguiente</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
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
          initialMonth={selectedMonth}
          initialClassroomId={selectedClassroomId}
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

      {/* Modal Kiosco Lector QR en Puerta / Ingreso */}
      {isQrScannerOpen && (
        <QrScannerModal onClose={() => setIsQrScannerOpen(false)} />
      )}

      {/* Modal de Configuración de Horarios & Auto-Cierre */}
      {isScheduleModalOpen && (
        <AttendanceScheduleModal onClose={() => setIsScheduleModalOpen(false)} />
      )}
    </div>
  );
};
