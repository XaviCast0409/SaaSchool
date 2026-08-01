import React, { useState } from 'react';
import {
  CalendarCheck,
  Calendar as CalendarIcon,
  CheckCircle2,
  XCircle,
  Clock,
  School,
  FileSpreadsheet,
  Check,
  RotateCcw,
  Loader2,
  UserCheck,
} from 'lucide-react';
import { useAttendance, useUpdateAttendance } from '../api/useAttendance';
import { AttendanceStatusBadge } from '../components/AttendanceStatusBadge';
import { AttendanceMonthlyReport } from '../components/AttendanceMonthlyReport';
import { BulkAttendanceModal } from '../components/BulkAttendanceModal';
import { useClassrooms } from '@/features/classrooms/api/useClassrooms';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { AttendanceStatus } from '../types';

const STATUS_OPTIONS: Array<{ value: AttendanceStatus; label: string; color: string }> = [
  { value: 'PRESENT', label: 'Presente', color: 'hover:bg-emerald-500/10 hover:text-emerald-600' },
  { value: 'ABSENT_UNJUSTIFIED', label: 'Falta Inj.', color: 'hover:bg-destructive/10 hover:text-destructive' },
  { value: 'ABSENT_JUSTIFIED', label: 'Falta Just.', color: 'hover:bg-amber-500/10 hover:text-amber-600' },
  { value: 'LATE_UNJUSTIFIED', label: 'Tardanza', color: 'hover:bg-amber-500/10 hover:text-amber-600' },
];

export const AttendancePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'DAILY' | 'MONTHLY'>('DAILY');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>('');
  const [editingAttendanceId, setEditingAttendanceId] = useState<string | null>(null);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  // Queries
  const { data: classrooms = [] } = useClassrooms();
  const {
    data: attendanceList = [],
    isLoading,
    isError,
    refetch,
  } = useAttendance({
    date: selectedDate,
    classroomId: selectedClassroomId || undefined,
  });

  // Mutation para corregir asistencia via PATCH /api/attendance/:id
  const { mutate: updateAttendance, isPending: isUpdating } = useUpdateAttendance();

  // Metrics
  const presentCount = attendanceList.filter((a) => a.status === 'PRESENT').length;
  const absentCount = attendanceList.filter((a) => a.status.startsWith('ABSENT')).length;
  const lateCount = attendanceList.filter((a) => a.status.startsWith('LATE')).length;

  const handleStatusChange = (attendanceId: string, newStatus: AttendanceStatus) => {
    setEditingAttendanceId(attendanceId);
    updateAttendance(
      { id: attendanceId, status: newStatus },
      {
        onSettled: () => setEditingAttendanceId(null),
      }
    );
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
            Registro móvil, corrección en vivo y toma masiva por sección.
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
                onChange={(e) => setSelectedClassroomId(e.target.value)}
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

            {/* Date or Month Picker depending on Active Tab */}
            {activeTab === 'DAILY' ? (
              <div className="flex items-center gap-1.5 bg-card p-1.5 rounded-lg border border-border">
                <CalendarIcon className="w-4 h-4 text-muted-foreground ml-1 shrink-0" />
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="h-8 border-none bg-transparent text-xs font-semibold focus-visible:ring-0 w-36"
                />
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-card p-1.5 rounded-lg border border-border">
                <CalendarIcon className="w-4 h-4 text-muted-foreground ml-1 shrink-0" />
                <Input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="h-8 border-none bg-transparent text-xs font-semibold focus-visible:ring-0 w-36"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        <button
          onClick={() => setActiveTab('DAILY')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
            activeTab === 'DAILY'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <CalendarCheck className="w-4 h-4" />
          <span>Control Diario ({selectedDate})</span>
        </button>

        <button
          onClick={() => setActiveTab('MONTHLY')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
            activeTab === 'MONTHLY'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Reporte Mensual ({selectedMonth})</span>
        </button>
      </div>

      {/* Tab 1: Control Diario */}
      {activeTab === 'DAILY' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Presentes</CardTitle>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {presentCount}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Alumnos asistieron</p>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Faltas</CardTitle>
                <XCircle className="w-4 h-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{absentCount}</div>
                <p className="text-xs text-muted-foreground mt-1">Justificadas e Injustificadas</p>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Tardanzas</CardTitle>
                <Clock className="w-4 h-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{lateCount}</div>
                <p className="text-xs text-muted-foreground mt-1">Llegadas fuera de hora</p>
              </CardContent>
            </Card>
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
            <div className="rounded-md border border-border bg-card shadow-sm overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="text-xs font-bold uppercase">Estudiante</TableHead>
                    <TableHead className="text-xs font-bold uppercase">Sección</TableHead>
                    <TableHead className="text-xs font-bold uppercase">Estado Actual</TableHead>
                    <TableHead className="text-xs font-bold uppercase">Corregir / Cambiar Estado (PATCH)</TableHead>
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
                            <div className="text-[10px] font-mono text-muted-foreground">
                              {student?.documentId || student?.studentCode}
                            </div>
                          </TableCell>

                          <TableCell className="text-xs text-muted-foreground">
                            {classroom ? `${classroom.grade}° ${classroom.section}` : '—'}
                          </TableCell>

                          <TableCell>
                            <AttendanceStatusBadge status={item.status} />
                          </TableCell>

                          {/* Quick Change Buttons */}
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
                      <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <RotateCcw className="w-8 h-8 text-muted-foreground/50" />
                          <span>No hay asistencia registrada para la fecha ({selectedDate}).</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Reporte Mensual */}
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
    </div>
  );
};
