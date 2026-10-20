import React, { useState } from 'react';
import {
  FileSpreadsheet,
  School,
  Calendar as CalendarIcon,
  Search,
  Eye,
  Info,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Filter,
} from 'lucide-react';
import { useAttendanceMatrix } from '../api/useAttendance';
import { StudentAttendanceModal } from './StudentAttendanceModal';
import { useClassrooms } from '@/features/classrooms/api/useClassrooms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { AttendanceStatus } from '../types';
import { MatrixExportModal } from './MatrixExportModal';
import { useGetActiveSchool } from '@/features/schools/api/useSchool';
import { useAuthStore } from '@/store/useAuthStore';
import { getPeruCurrentMonth } from '@/lib/dateUtils';

interface AttendanceMatrixGridProps {
  initialMonth?: string;
  initialClassroomId?: string;
}

const STATUS_CODES: Record<AttendanceStatus, { code: string; bg: string; text: string; label: string }> = {
  PRESENT: { code: 'P', bg: 'bg-emerald-500/20 border-emerald-500/40', text: 'text-emerald-700 dark:text-emerald-300 font-bold', label: 'Presente' },
  ABSENT_UNJUSTIFIED: { code: 'FI', bg: 'bg-destructive/25 border-destructive/50', text: 'text-destructive font-black', label: 'Falta Injustificada' },
  ABSENT_JUSTIFIED: { code: 'FJ', bg: 'bg-amber-500/20 border-amber-500/40', text: 'text-amber-700 dark:text-amber-300 font-bold', label: 'Falta Justificada' },
  LATE_UNJUSTIFIED: { code: 'TI', bg: 'bg-amber-500/15 border-amber-500/30', text: 'text-amber-600 dark:text-amber-400 font-bold', label: 'Tardanza Injustificada' },
  LATE_JUSTIFIED: { code: 'TJ', bg: 'bg-sky-500/20 border-sky-500/40', text: 'text-sky-700 dark:text-sky-300 font-bold', label: 'Tardanza Justificada' },
};

const SPANISH_MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const SPANISH_DAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function formatMonthSpanish(monthStr: string): string {
  const [y, m] = monthStr.split('-').map(Number);
  if (!y || !m) return monthStr;
  return `${SPANISH_MONTHS[m - 1].toUpperCase()} ${y}`;
}

function getDayOfWeekShort(year: number, month: number, day: number): string {
  const date = new Date(year, month - 1, day);
  return SPANISH_DAYS_SHORT[date.getDay()];
}

function isWeekend(year: number, month: number, day: number): boolean {
  const date = new Date(year, month - 1, day);
  const dayIndex = date.getDay();
  return dayIndex === 0 || dayIndex === 6;
}

function navigateMonth(currentMonthStr: string, delta: number): string {
  const [y, m] = currentMonthStr.split('-').map(Number);
  const date = new Date(y, m - 1 + delta, 1);
  const nextY = date.getFullYear();
  const nextM = String(date.getMonth() + 1).padStart(2, '0');
  return `${nextY}-${nextM}`;
}

export const AttendanceMatrixGrid: React.FC<AttendanceMatrixGridProps> = ({
  initialMonth = getPeruCurrentMonth(),
  initialClassroomId = '',
}) => {
  const [month, setMonth] = useState(initialMonth);
  const [classroomId, setClassroomId] = useState(initialClassroomId);
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'NORMAL'>('ALL');
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<string | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Queries
  const { data: classrooms = [] } = useClassrooms();
  const user = useAuthStore((state) => state.user);
  const isTeacher = user?.role === 'TEACHER';
  const tutoredClassrooms = isTeacher
    ? classrooms.filter((c) => c.tutorTeacherId === user?.id || c.tutorTeacher?.id === user?.id)
    : [];
  const isTutor = tutoredClassrooms.length > 0;
  const availableClassrooms = isTeacher && isTutor ? tutoredClassrooms : classrooms;

  // Auto-seleccionar aula tutoriada para docentes
  React.useEffect(() => {
    if (isTeacher && isTutor && availableClassrooms.length > 0 && !classroomId) {
      setClassroomId(availableClassrooms[0].id);
    }
  }, [isTeacher, isTutor, availableClassrooms, classroomId]);

  const { data: school } = useGetActiveSchool();
  const { data: matrixData, isLoading, isError } = useAttendanceMatrix({ month, classroomId });

  const students = matrixData?.students ?? [];
  const daysInMonth = matrixData?.daysInMonth ?? 31;
  const [yearNum, monthNum] = month.split('-').map(Number);

  const activeClassroom = classrooms.find((c) => c.id === classroomId);
  const classroomLabel = activeClassroom
    ? `${activeClassroom.grade}° ${activeClassroom.section} (${activeClassroom.educationLevel})`
    : undefined;

  // Conteos por nivel de riesgo para los chips de filtro
  const criticalCount = students.filter((s) => s.riskLevel === 'CRITICAL').length;
  const warningCount = students.filter((s) => s.riskLevel === 'WARNING').length;
  const normalCount = students.filter((s) => s.riskLevel === 'NORMAL').length;

  // Filtrado compuesto por nombre/DNI + Semáforo de Riesgo
  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.documentId.includes(searchQuery);

    const matchesRisk = riskFilter === 'ALL' || s.riskLevel === riskFilter;

    return matchesSearch && matchesRisk;
  });

  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="space-y-4">
      {/* Banner de Alerta Crítica de Inasistencia si hay alumnos en riesgo */}
      {criticalCount > 0 && (
        <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs font-semibold shadow-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0 animate-bounce text-destructive" />
            <div>
              <span>
                Atención Director: Se detectaron <strong>{criticalCount} estudiante(s)</strong> con RIESGO CRÍTICO de inasistencia/deserción este mes.
              </span>
              <p className="text-[11px] opacity-90 font-normal">
                Han acumulado 3 o más faltas injustificadas. Haz clic para filtrar e iniciar la citación de apoderados.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-destructive/40 text-destructive hover:bg-destructive/15 shrink-0 font-bold"
            onClick={() => setRiskFilter(riskFilter === 'CRITICAL' ? 'ALL' : 'CRITICAL')}
          >
            {riskFilter === 'CRITICAL' ? 'Ver Todos' : `Ver los ${criticalCount} en Riesgo`}
          </Button>
        </div>
      )}

      {/* Bar de Controles y Filtros */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border shadow-sm">
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          {/* Selector de Aula */}
          <div className="flex items-center gap-1.5 bg-background px-3 py-1.5 rounded-lg border border-input text-xs font-semibold">
            <School className="w-4 h-4 text-muted-foreground" />
            <select
              value={classroomId}
              onChange={(e) => setClassroomId(e.target.value)}
              className="bg-transparent border-none focus:outline-none text-foreground font-semibold cursor-pointer"
              disabled={isTeacher && availableClassrooms.length === 1}
            >
              <option value="">— Todas las Secciones —</option>
              {availableClassrooms.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.grade}° {c.section} ({c.educationLevel})
                  {c.tutorTeacherId === user?.id ? ' • Su Aula Tutoriada' : isTeacher && !isTutor ? ' (Consulta)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Navegación por Mes (Anterior / Siguiente) */}
          <div className="flex items-center gap-1 bg-background p-1 rounded-lg border border-input text-xs font-semibold">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
              title="Mes Anterior"
              onClick={() => setMonth((m) => navigateMonth(m, -1))}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>

            <div className="flex items-center gap-1 px-1">
              <CalendarIcon className="w-3.5 h-3.5 text-primary" />
              <Input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="h-6 border-none bg-transparent text-xs font-bold focus-visible:ring-0 w-32 p-0 cursor-pointer"
              />
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
              title="Mes Siguiente"
              onClick={() => setMonth((m) => navigateMonth(m, 1))}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Buscador de Alumno */}
          <div className="relative flex-1 sm:w-44">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar por nombre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs bg-background"
            />
          </div>
        </div>

        {/* Exportar a Excel */}
        <Button
          onClick={() => setIsExportModalOpen(true)}
          disabled={filteredStudents.length === 0}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm text-xs w-full lg:w-auto font-bold"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Exportar Matriz Excel Profesional</span>
        </Button>
      </div>

      {/* Chips de Filtro por Semáforo de Riesgo MINEDU */}
      <div className="flex items-center justify-between gap-2 flex-wrap bg-muted/30 p-2 rounded-xl border border-border text-xs">
        <div className="flex items-center gap-1 text-muted-foreground font-semibold px-2">
          <Filter className="w-3.5 h-3.5 text-primary" />
          <span>Filtrar por Riesgo:</span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setRiskFilter('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              riskFilter === 'ALL'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-background text-muted-foreground border border-border hover:bg-muted'
            }`}
          >
            Todos ({students.length})
          </button>

          <button
            onClick={() => setRiskFilter('CRITICAL')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              riskFilter === 'CRITICAL'
                ? 'bg-destructive text-destructive-foreground shadow-sm font-black'
                : 'bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20'
            }`}
          >
            🔴 Riesgo Crítico ({criticalCount})
          </button>

          <button
            onClick={() => setRiskFilter('WARNING')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              riskFilter === 'WARNING'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20'
            }`}
          >
            🟡 Advertencia ({warningCount})
          </button>

          <button
            onClick={() => setRiskFilter('NORMAL')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              riskFilter === 'NORMAL'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20'
            }`}
          >
            🟢 Normal ({normalCount})
          </button>
        </div>
      </div>

      {/* Simbología Leyenda Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-muted/40 rounded-lg border border-border text-xs">
        <div className="flex items-center gap-1 text-muted-foreground font-medium">
          <Info className="w-3.5 h-3.5 text-primary" />
          <span>Simbología SIAGIE MINEDU:</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap text-[11px] font-semibold">
          <span className="flex items-center gap-1">
            <span className="w-4 h-4 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-center font-bold text-[10px]">
              P
            </span>
            Presente
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-4 rounded bg-destructive/25 border border-destructive/50 text-destructive text-center font-black text-[10px]">
              FI
            </span>
            Falta Injust.
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-4 rounded bg-amber-500/20 border border-amber-500/40 text-amber-700 dark:text-amber-300 text-center font-bold text-[10px]">
              FJ
            </span>
            Falta Just.
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-4 rounded bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-center font-bold text-[10px]">
              TI
            </span>
            Tardanza Inj.
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-4 rounded bg-sky-500/20 border border-sky-500/40 text-sky-700 dark:text-sky-300 text-center font-bold text-[10px]">
              TJ
            </span>
            Tardanza Just.
          </span>
        </div>
      </div>

      {/* Grid Table */}
      {!classroomId ? (
        <div className="py-16 text-center text-muted-foreground border border-dashed border-border rounded-xl space-y-3 bg-card p-6">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <School className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-base text-foreground">Selecciona una Sección Educativa</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Para optimizar el rendimiento y evitar consumo masivo de datos, por favor selecciona un Aula/Sección en la barra de filtros para consultar la sábana de asistencia.
            </p>
          </div>
        </div>
      ) : isLoading ? (
        <Skeleton className="h-96 w-full rounded-xl" />
      ) : isError ? (
        <div className="p-8 text-center text-destructive border border-destructive/20 bg-destructive/10 rounded-xl font-medium">
          Error al cargar la sábana de asistencia mensual.
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground border border-dashed border-border rounded-xl space-y-1">
          <p className="font-semibold text-sm">No hay estudiantes encontrados</p>
          <p className="text-xs text-muted-foreground">
            {riskFilter !== 'ALL'
              ? `Ningún alumno coincide con el filtro de riesgo "${riskFilter}". Prueba seleccionando "Todos".`
              : `Sin estudiantes para la sección y mes (${formatMonthSpanish(month)}).`}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse min-w-[950px]">
              <thead>
                {/* Header Row 1: Days of Week */}
                <tr className="bg-muted/80 border-b border-border text-muted-foreground font-bold uppercase text-[10px]">
                  <th className="p-1.5 w-10 text-center sticky left-0 bg-muted/90 backdrop-blur z-10 border-r border-border">
                    #
                  </th>
                  <th className="p-1.5 min-w-[200px] sticky left-10 bg-muted/90 backdrop-blur z-10 border-r border-border">
                    Estudiante
                  </th>
                  <th className="p-1.5 w-14 text-center border-r border-border">Sec.</th>

                  {daysArray.map((day) => {
                    const dayName = getDayOfWeekShort(yearNum, monthNum, day);
                    const weekend = isWeekend(yearNum, monthNum, day);
                    return (
                      <th
                        key={`dayname-${day}`}
                        className={`p-1 w-7 text-center border-r border-border text-[9px] font-bold ${
                          weekend ? 'bg-muted/90 text-muted-foreground/60' : 'text-primary'
                        }`}
                      >
                        {dayName}
                      </th>
                    );
                  })}

                  <th colSpan={4} className="p-1 text-center bg-muted/90 border-r border-border">
                    Totales Mes
                  </th>
                  <th className="p-1 text-center bg-muted/90">Exp.</th>
                </tr>

                {/* Header Row 2: Date Numbers */}
                <tr className="bg-muted/40 border-b border-border text-muted-foreground font-bold text-[10px]">
                  <th className="p-1.5 text-center sticky left-0 bg-muted/70 backdrop-blur z-10 border-r border-border">
                    N°
                  </th>
                  <th className="p-1.5 sticky left-10 bg-muted/70 backdrop-blur z-10 border-r border-border">
                    Apellidos y Nombres
                  </th>
                  <th className="p-1.5 text-center border-r border-border">Aula</th>

                  {daysArray.map((day) => {
                    const weekend = isWeekend(yearNum, monthNum, day);
                    return (
                      <th
                        key={`daynum-${day}`}
                        className={`p-1 w-7 text-center border-r border-border text-[10px] font-mono ${
                          weekend ? 'bg-muted/60 text-muted-foreground/50' : 'text-foreground'
                        }`}
                      >
                        {day}
                      </th>
                    );
                  })}

                  <th className="p-1.5 w-10 text-center text-emerald-600 dark:text-emerald-400">P</th>
                  <th className="p-1.5 w-10 text-center text-destructive">FI</th>
                  <th className="p-1.5 w-10 text-center text-amber-600">FJ</th>
                  <th className="p-1.5 w-14 text-center font-bold">% Asist</th>
                  <th className="p-1.5 w-10 text-center">Ver</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredStudents.map((s, index) => {
                  return (
                    <tr
                      key={s.enrollmentId}
                      onClick={() => setSelectedEnrollmentId(s.enrollmentId)}
                      className={`cursor-pointer transition-colors hover:bg-muted/30 ${
                        s.riskLevel === 'CRITICAL'
                          ? 'bg-destructive/5'
                          : s.riskLevel === 'WARNING'
                          ? 'bg-amber-500/5'
                          : ''
                      }`}
                    >
                      <td className="p-2 text-center font-mono text-muted-foreground sticky left-0 bg-card z-10 border-r border-border font-bold">
                        {index + 1}
                      </td>

                      <td className="p-2 sticky left-10 bg-card z-10 border-r border-border">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-semibold text-foreground truncate max-w-[180px]">
                            {s.studentName}
                          </span>
                          {s.riskLevel === 'CRITICAL' ? (
                            <span
                              title="Riesgo Crítico de Inasistencia (3+ faltas acumuladas)"
                              className="px-1.5 py-0.5 rounded bg-destructive text-destructive-foreground text-[9px] font-black shrink-0 animate-pulse"
                            >
                              RIESGO
                            </span>
                          ) : s.riskLevel === 'WARNING' ? (
                            <span
                              title="Advertencia de Inasistencia"
                              className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[9px] font-bold shrink-0"
                            >
                              ADV
                            </span>
                          ) : null}
                        </div>
                      </td>

                      <td className="p-2 text-center font-mono text-muted-foreground border-r border-border">
                        {s.grade}{s.section}
                      </td>

                      {/* Daily Cells con indicador visual de nota/justificación */}
                      {daysArray.map((day) => {
                        const status = s.dailyStatus[day];
                        const note = s.dailyNotes[day];
                        const cfg = status ? STATUS_CODES[status] : null;
                        const weekend = isWeekend(yearNum, monthNum, day);

                        return (
                          <td
                            key={day}
                            title={
                              status
                                ? `Día ${day}: ${cfg?.label}${note ? ` | Observación: ${note}` : ''}`
                                : `Día ${day}: Sin registro`
                            }
                            className={`p-0.5 text-center border-r border-border font-mono text-[10px] relative group ${
                              weekend && !status ? 'bg-muted/20' : ''
                            }`}
                          >
                            {cfg ? (
                              <div
                                className={`w-6 h-6 mx-auto rounded flex items-center justify-center border relative ${cfg.bg} ${cfg.text}`}
                              >
                                {cfg.code}
                                {note && (
                                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary ring-1 ring-background" />
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground/20 font-sans">-</span>
                            )}
                          </td>
                        );
                      })}

                      {/* Totals */}
                      <td className="p-2 text-center font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        {s.counts.PRESENT}
                      </td>
                      <td className="p-2 text-center font-bold text-destructive font-mono">
                        {s.counts.ABSENT_UNJUSTIFIED}
                      </td>
                      <td className="p-2 text-center font-bold text-amber-600 font-mono">
                        {s.counts.ABSENT_JUSTIFIED}
                      </td>
                      <td className="p-2 text-center font-bold font-mono">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] ${
                            s.attendanceRate >= 90
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : s.attendanceRate >= 80
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                              : 'bg-destructive/10 text-destructive'
                          }`}
                        >
                          {s.attendanceRate}%
                        </span>
                      </td>

                      {/* Action */}
                      <td className="p-2 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEnrollmentId(s.enrollmentId);
                          }}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Expediente Individual */}
      {selectedEnrollmentId && (
        <StudentAttendanceModal
          enrollmentId={selectedEnrollmentId}
          month={month}
          onClose={() => setSelectedEnrollmentId(null)}
        />
      )}

      {/* Modal de Opciones de Exportación Excel (Con Colores o Plantilla Vacía) */}
      {isExportModalOpen && (
        <MatrixExportModal
          students={filteredStudents}
          monthStr={month}
          daysInMonth={daysInMonth}
          classroomLabel={classroomLabel}
          schoolName={school?.name}
          onClose={() => setIsExportModalOpen(false)}
        />
      )}
    </div>
  );
};
