import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, UserCheck, Save, Users, Calendar as CalendarIcon, School } from 'lucide-react';
import { useBulkAttendance } from '../api/useAttendance';
import { useEnrollments } from '@/features/enrollments/api/useEnrollments';
import { useClassrooms } from '@/features/classrooms/api/useClassrooms';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { AttendanceStatus } from '../types';

interface BulkAttendanceModalProps {
  initialClassroomId?: string;
  initialDate?: string;
  onClose: () => void;
}

// Fix #3: LATE_JUSTIFIED añadido como estado válido según MINEDU
const STATUS_CONFIG: Array<{ value: AttendanceStatus; label: string; activeClass: string }> = [
  { value: 'PRESENT', label: 'Presente', activeClass: 'bg-emerald-600 text-white font-semibold shadow-sm' },
  { value: 'ABSENT_UNJUSTIFIED', label: 'Falta Inj.', activeClass: 'bg-destructive text-destructive-foreground font-semibold shadow-sm' },
  { value: 'ABSENT_JUSTIFIED', label: 'Falta Just.', activeClass: 'bg-amber-600 text-white font-semibold shadow-sm' },
  { value: 'LATE_UNJUSTIFIED', label: 'Tardanza Inj.', activeClass: 'bg-amber-500 text-white font-semibold shadow-sm' },
  { value: 'LATE_JUSTIFIED', label: 'Tardanza Just.', activeClass: 'bg-sky-600 text-white font-semibold shadow-sm' },
];

export const BulkAttendanceModal: React.FC<BulkAttendanceModalProps> = ({
  initialClassroomId = '',
  initialDate = new Date().toISOString().split('T')[0],
  onClose,
}) => {
  const user = useAuthStore((state) => state.user);
  const isTeacher = user?.role === 'TEACHER';

  // Queries & Mutations
  const { data: classrooms = [] } = useClassrooms();
  const availableClassrooms = isTeacher
    ? classrooms.filter((c) => c.tutorTeacherId === user?.id || c.tutorTeacher?.id === user?.id)
    : classrooms;

  const [selectedClassroomId, setSelectedClassroomId] = useState(
    initialClassroomId || (availableClassrooms[0]?.id ?? '')
  );
  const [selectedDate, setSelectedDate] = useState(initialDate);

  // Status mapping: enrollmentId -> AttendanceStatus
  const [attendanceState, setAttendanceState] = useState<Record<string, AttendanceStatus>>({});

  const { data: enrollments = [], isLoading: isLoadingEnrollments } = useEnrollments();
  const { mutate: submitBulk, isPending, error } = useBulkAttendance();

  // Si hay aulas disponibles y no hay seleccionada, preseleccionar la primera
  useEffect(() => {
    if (availableClassrooms.length > 0 && !selectedClassroomId) {
      setSelectedClassroomId(availableClassrooms[0].id);
    }
  }, [availableClassrooms, selectedClassroomId]);

  // Filter enrollments belonging to the selected classroom
  const filteredEnrollments = selectedClassroomId
    ? enrollments.filter((e) => e.classroomId === selectedClassroomId)
    : [];

  // Initialize all students to "PRESENT" by default for 1-click speed
  useEffect(() => {
    const initialState: Record<string, AttendanceStatus> = {};
    filteredEnrollments.forEach((e) => {
      initialState[e.id] = 'PRESENT';
    });
    setAttendanceState(initialState);
  }, [selectedClassroomId, enrollments.length]);

  const handleStudentStatusChange = (enrollmentId: string, status: AttendanceStatus) => {
    setAttendanceState((prev) => ({
      ...prev,
      [enrollmentId]: status,
    }));
  };

  const handleSetAll = (status: AttendanceStatus) => {
    const nextState: Record<string, AttendanceStatus> = {};
    filteredEnrollments.forEach((e) => {
      nextState[e.id] = status;
    });
    setAttendanceState(nextState);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!filteredEnrollments.length) return;

    const records = filteredEnrollments.map((e) => ({
      enrollmentId: e.id,
      status: attendanceState[e.id] || 'PRESENT',
    }));

    submitBulk(
      {
        date: selectedDate,
        records,
      },
      {
        onSuccess: () => {
          onClose();
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4 bg-card shrink-0">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-primary" />
            <div>
              <h2 className="font-bold text-base text-foreground leading-none">
                Toma de Asistencia Masiva por Aula
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Registra la asistencia completa de la sección en un solo paso.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Controls Bar: Classroom & Date */}
        <div className="p-4 bg-muted/40 border-b border-border flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* Classroom Dropdown */}
            <div className="flex items-center gap-1.5 bg-background px-3 py-1.5 rounded-lg border border-input text-xs font-semibold">
              <School className="w-4 h-4 text-muted-foreground" />
              <select
                value={selectedClassroomId}
                onChange={(e) => setSelectedClassroomId(e.target.value)}
                className="bg-transparent border-none focus:outline-none text-foreground font-semibold cursor-pointer"
                disabled={isTeacher && availableClassrooms.length === 1}
              >
                {!isTeacher && <option value="">— Seleccionar Aula/Sección —</option>}
                {isTeacher && availableClassrooms.length === 0 && (
                  <option value="">— Sin aula tutoriada asignada —</option>
                )}
                {availableClassrooms.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.grade}° "{c.section}" ({c.educationLevel === 'PRIMARY' ? 'Primaria' : c.educationLevel === 'SECONDARY' ? 'Secundaria' : 'Inicial'})
                    {isTeacher ? ' • Su Aula Tutoriada' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Input */}
            <div className="flex items-center gap-1.5 bg-background px-3 py-1.5 rounded-lg border border-input text-xs font-semibold">
              <CalendarIcon className="w-4 h-4 text-muted-foreground" />
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-6 border-none bg-transparent text-xs font-semibold focus-visible:ring-0 w-32 p-0"
              />
            </div>
          </div>

          {/* Quick Bulk Action Buttons */}
          {filteredEnrollments.length > 0 && (
            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-[11px] px-2 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                onClick={() => handleSetAll('PRESENT')}
              >
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Todos Presentes
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-[11px] px-2 text-destructive border-destructive/30"
                onClick={() => handleSetAll('ABSENT_UNJUSTIFIED')}
              >
                Todos Faltó
              </Button>
            </div>
          )}
        </div>

        {/* Student List Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {error && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-xs font-medium border border-destructive/20 mb-3">
              {(error as { response?: { data?: { message?: string } } }).response?.data?.message ||
                'Error al guardar la asistencia masiva.'}
            </div>
          )}

          {!selectedClassroomId ? (
            <div className="py-12 text-center text-sm text-muted-foreground border border-dashed border-border rounded-xl space-y-2">
              <Users className="w-8 h-8 text-muted-foreground/40 mx-auto" />
              <p className="font-medium">Por favor, selecciona un Aula/Sección arriba para ver a los estudiantes.</p>
            </div>
          ) : isLoadingEnrollments ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : filteredEnrollments.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground border border-dashed border-border rounded-xl">
              No hay estudiantes matriculados en la sección seleccionada.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredEnrollments.map((enrollment, index) => {
                const student = enrollment.student;
                const currentStatus = attendanceState[enrollment.id] || 'PRESENT';

                return (
                  <div
                    key={enrollment.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/20 transition-colors gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 text-xs font-bold text-muted-foreground text-center">
                        {index + 1}
                      </span>
                      <div>
                        <div className="font-semibold text-sm text-foreground">
                          {student
                            ? `${student.lastNamePaternal} ${student.lastNameMaternal}, ${student.firstNames}`
                            : 'Estudiante'}
                        </div>
                        <div className="text-[11px] font-mono text-muted-foreground">
                          Doc: {student?.documentId || 'S/D'}
                        </div>
                      </div>
                    </div>

                    {/* Status Buttons */}
                    <div className="flex items-center gap-1 flex-wrap shrink-0">
                      {STATUS_CONFIG.map((opt) => {
                        const isSelected = currentStatus === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => handleStudentStatusChange(enrollment.id, opt.value)}
                            className={`px-2.5 py-1.5 rounded-md text-xs font-medium border transition-all ${
                              isSelected
                                ? opt.activeClass
                                : 'border-border bg-background text-muted-foreground hover:bg-muted'
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-card flex items-center justify-between shrink-0">
          <span className="text-xs text-muted-foreground font-medium">
            {filteredEnrollments.length > 0
              ? `${filteredEnrollments.length} alumnos listos para registrar`
              : 'Selecciona una sección'}
          </span>

          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              isLoading={isPending}
              disabled={!filteredEnrollments.length}
              onClick={handleSubmit}
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Asistencia del Aula</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
