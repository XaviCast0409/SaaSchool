import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BookOpenCheck, Layers, SlidersHorizontal, Printer, FileSpreadsheet, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import {
  useCourseAssignments,
  useMyCourseAssignments,
} from '@/features/course-assignments/api/useCourseAssignments';
import { useGradeMatrix } from '../api/useGrades';
import { GradesFilterBar } from './GradesFilterBar';
import { GradesMatrixGrid } from './GradesMatrixGrid';
import { CompetenceCommentsView } from './CompetenceCommentsView';
import { EvaluationCriteriaModal } from './EvaluationCriteriaModal';
import { ReportCardModal } from './ReportCardModal';
import { SiagieConsolidatedModal } from './SiagieConsolidatedModal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export const TeacherAdminGradesView: React.FC = () => {
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();

  const isTeacher = user?.role === 'TEACHER';
  const isAdmin = user?.role === 'SCHOOL_ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'ADMINISTRATIVE';

  const [isCriteriaModalOpen, setIsCriteriaModalOpen] = useState(false);
  const [isReportCardModalOpen, setIsReportCardModalOpen] = useState(false);
  const [selectedReportCardEnrollmentId, setSelectedReportCardEnrollmentId] = useState<string | null>(null);
  const [isSiagieModalOpen, setIsSiagieModalOpen] = useState(false);
  const [activeGradeTab, setActiveGradeTab] = useState<'matrix' | 'conclusions'>('matrix');

  // Carga de asignaciones segura por rol (evita 403 Forbidden)
  const teacherQuery = useMyCourseAssignments({ enabled: isTeacher });
  const adminQuery = useCourseAssignments({ enabled: isAdmin });

  const assignments = useMemo(() => {
    return isTeacher ? teacherQuery.data || [] : adminQuery.data || [];
  }, [isTeacher, teacherQuery.data, adminQuery.data]);

  const [selectedClassroomId, setSelectedClassroomId] = useState<string>('');
  const [selectedCourseAssignmentId, setSelectedCourseAssignmentId] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<number>(1);
  const [showWithdrawn, setShowWithdrawn] = useState<boolean>(false);
  const [showTransferred, setShowTransferred] = useState<boolean>(false);

  useEffect(() => {
    const paramAssignmentId = searchParams.get('courseAssignmentId');
    const paramClassroomId = searchParams.get('classroomId');

    if (paramClassroomId && !selectedClassroomId) {
      setSelectedClassroomId(paramClassroomId);
    }
    if (paramAssignmentId && !selectedCourseAssignmentId) {
      setSelectedCourseAssignmentId(paramAssignmentId);
    }
  }, [searchParams, selectedClassroomId, selectedCourseAssignmentId]);

  const availableClassrooms = useMemo(() => {
    const map = new Map<string, { id: string; grade: number; section: string; educationLevel: string }>();
    assignments.forEach((a) => {
      if (a.classroom && !map.has(a.classroomId)) {
        map.set(a.classroomId, {
          id: a.classroomId,
          grade: a.classroom.grade,
          section: a.classroom.section,
          educationLevel: a.classroom.educationLevel,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      if (a.educationLevel !== b.educationLevel) return a.educationLevel.localeCompare(b.educationLevel);
      if (a.grade !== b.grade) return a.grade - b.grade;
      return a.section.localeCompare(b.section);
    });
  }, [assignments]);

  const availableCourses = useMemo(() => {
    if (!selectedClassroomId) return [];
    return assignments
      .filter((a) => a.classroomId === selectedClassroomId)
      .map((a) => {
        const tName = a.teacher
          ? `Prof. ${a.teacher.firstName} ${a.teacher.lastNamePaternal}`
          : isTeacher && user
            ? `Prof. ${user.firstName} ${user.lastNamePaternal}`
            : '—';
        return {
          id: a.id,
          name: a.area ? a.area.name : 'Curso General',
          officialCode: a.area?.officialCode || '',
          teacherName: tName,
        };
      });
  }, [assignments, selectedClassroomId, isTeacher, user]);

  useEffect(() => {
    if (selectedClassroomId && availableClassrooms.length > 0) {
      const exists = availableClassrooms.some((c) => c.id === selectedClassroomId);
      if (!exists) {
        setSelectedClassroomId('');
        setSelectedCourseAssignmentId('');
      }
    }
  }, [availableClassrooms, selectedClassroomId]);

  useEffect(() => {
    if (selectedCourseAssignmentId && availableCourses.length > 0) {
      const exists = availableCourses.some((c) => c.id === selectedCourseAssignmentId);
      if (!exists) {
        setSelectedCourseAssignmentId('');
      }
    }
  }, [availableCourses, selectedCourseAssignmentId]);

  const activeAssignment = useMemo(() => {
    return assignments.find((a) => a.id === selectedCourseAssignmentId);
  }, [assignments, selectedCourseAssignmentId]);

  const teacherName = useMemo(() => {
    if (isTeacher && user) {
      return `Prof. ${user.firstName} ${user.lastNamePaternal}`;
    }
    if (activeAssignment?.teacher) {
      return `Prof. ${activeAssignment.teacher.firstName} ${activeAssignment.teacher.lastNamePaternal}`;
    }
    return '';
  }, [isTeacher, user, activeAssignment]);

  const { data: matrixData } = useGradeMatrix(selectedCourseAssignmentId, selectedPeriod);

  const classroomStudents = useMemo(() => {
    if (!matrixData?.assignment?.classroom?.enrollments) return [];
    return matrixData.assignment.classroom.enrollments
      .filter((e) => {
        if (e.enrollmentState === 'WITHDRAWN' && !showWithdrawn) return false;
        if (e.enrollmentState === 'TRANSFERRED' && !showTransferred) return false;
        return true;
      })
      .map((e) => ({
        id: e.id,
        name: `${e.student.lastNamePaternal} ${e.student.lastNameMaternal || ''}, ${e.student.firstNames}`.trim(),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [matrixData?.assignment?.classroom?.enrollments, showWithdrawn, showTransferred]);

  const activeClassroom = useMemo(() => {
    return availableClassrooms.find((c) => c.id === selectedClassroomId);
  }, [availableClassrooms, selectedClassroomId]);

  const classroomLabel = activeClassroom
    ? `${activeClassroom.grade}° "${activeClassroom.section}"`
    : '';

  const handleClassroomChange = (classroomId: string) => {
    setSelectedClassroomId(classroomId);
    setSelectedCourseAssignmentId('');
  };

  return (
    <div className="space-y-5 pb-10">
      {/* Cabecera Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <BookOpenCheck className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Registro de Notas
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Ingreso de calificaciones con promedios reactivos y conversión automática a escala oficial AD / A / B / C.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin && selectedClassroomId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSiagieModalOpen(true)}
              className="gap-2 text-xs font-semibold shadow-sm border-border bg-card hover:bg-secondary text-foreground"
              title="Ver avance de docentes, notas del aula y exportar a Excel para SIAGIE"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Consolidado SIAGIE</span>
            </Button>
          )}

          {selectedCourseAssignmentId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (classroomStudents.length > 0) {
                  setSelectedReportCardEnrollmentId(classroomStudents[0].id);
                  setIsReportCardModalOpen(true);
                }
              }}
              disabled={classroomStudents.length === 0}
              className="gap-2 text-xs font-semibold shadow-sm border-border bg-card hover:bg-secondary"
            >
              <Printer className="w-4 h-4 text-primary" />
              <span>Libreta Oficial (PDF)</span>
            </Button>
          )}

          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCriteriaModalOpen(true)}
              className="gap-2 text-xs font-semibold shadow-sm border-border bg-card hover:bg-secondary"
            >
              <SlidersHorizontal className="w-4 h-4 text-primary" />
              <span>Configurar Criterios</span>
            </Button>
          )}
        </div>
      </div>

      {/* Barra de Filtros Cubicol */}
      <GradesFilterBar
        selectedClassroomId={selectedClassroomId}
        selectedCourseAssignmentId={selectedCourseAssignmentId}
        selectedPeriod={selectedPeriod}
        showWithdrawn={showWithdrawn}
        showTransferred={showTransferred}
        teacherName={teacherName}
        classrooms={availableClassrooms}
        courses={availableCourses}
        onClassroomChange={handleClassroomChange}
        onCourseChange={setSelectedCourseAssignmentId}
        onPeriodChange={setSelectedPeriod}
        onToggleWithdrawn={setShowWithdrawn}
        onToggleTransferred={setShowTransferred}
      />

      {/* Matriz o Prompt de Selección */}
      {selectedCourseAssignmentId ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-border">
            <button
              type="button"
              onClick={() => setActiveGradeTab('matrix')}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold border-b-2 transition-all ${activeGradeTab === 'matrix'
                  ? 'border-primary text-primary bg-primary/5 rounded-t-lg'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Criterios de Evaluación</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveGradeTab('conclusions')}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold border-b-2 transition-all ${activeGradeTab === 'conclusions'
                  ? 'border-primary text-primary bg-primary/5 rounded-t-lg'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>Conclusiones por Competencias</span>
            </button>
          </div>

          {activeGradeTab === 'matrix' ? (
            <GradesMatrixGrid
              courseAssignmentId={selectedCourseAssignmentId}
              periodNumber={selectedPeriod}
              showWithdrawn={showWithdrawn}
              showTransferred={showTransferred}
              onOpenReportCard={(enrollmentId) => {
                setSelectedReportCardEnrollmentId(enrollmentId);
                setIsReportCardModalOpen(true);
              }}
            />
          ) : (
            <CompetenceCommentsView
              courseAssignmentId={selectedCourseAssignmentId}
              periodNumber={selectedPeriod}
              showWithdrawn={showWithdrawn}
              showTransferred={showTransferred}
              onOpenReportCard={(enrollmentId) => {
                setSelectedReportCardEnrollmentId(enrollmentId);
                setIsReportCardModalOpen(true);
              }}
            />
          )}
        </div>
      ) : (
        <Card className="p-12 text-center border-dashed border-border bg-card">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
            <Layers className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-foreground">
            Selecciona un Salón y Curso para comenzar
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1.5 leading-relaxed">
            Elige el aula, la asignatura y el periodo académico en la barra de filtros superior para cargar la matriz de calificaciones e ingresar las notas del bimestre.
          </p>
        </Card>
      )}

      {/* Modales */}
      <EvaluationCriteriaModal
        isOpen={isCriteriaModalOpen}
        onClose={() => setIsCriteriaModalOpen(false)}
      />

      <ReportCardModal
        isOpen={isReportCardModalOpen}
        onClose={() => {
          setIsReportCardModalOpen(false);
          setSelectedReportCardEnrollmentId(null);
        }}
        enrollmentId={selectedReportCardEnrollmentId}
        classroomStudents={classroomStudents}
      />

      {isAdmin && (
        <SiagieConsolidatedModal
          isOpen={isSiagieModalOpen}
          onClose={() => setIsSiagieModalOpen(false)}
          classroomId={selectedClassroomId}
          classroomLabel={classroomLabel}
          periodNumber={selectedPeriod}
        />
      )}
    </div>
  );
};
