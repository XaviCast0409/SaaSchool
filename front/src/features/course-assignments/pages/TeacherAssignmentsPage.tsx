import React, { useState, useMemo } from 'react';
import {
  UserCheck,
  Plus,
  Trash2,
  BookOpen,
  School as SchoolIcon,
  Users,
  Layers,
  GraduationCap,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import {
  useCourseAssignments,
  useCreateCourseAssignment,
  useBulkAssignUnidocente,
  useDeleteCourseAssignment,
} from '../api/useCourseAssignments';
import { useClassrooms } from '@/features/classrooms/api/useClassrooms';
import { useCurricularAreas } from '@/features/curricular-areas/api/useCurricularAreas';
import { useUsers } from '@/features/users/api/useUsers';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

type LevelFilter = 'ALL' | 'INITIAL' | 'PRIMARY' | 'SECONDARY';

const LEVEL_LABEL: Record<string, string> = {
  INITIAL: 'Inicial',
  PRIMARY: 'Primaria',
  SECONDARY: 'Secundaria',
};

export const TeacherAssignmentsPage: React.FC = () => {
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('ALL');

  // Unidocente modal state
  const [uniClassroomId, setUniClassroomId] = useState('');
  const [uniTeacherId, setUniTeacherId] = useState('');

  // Polidocente modal state
  const [polyClassroomId, setPolyClassroomId] = useState('');
  const [polyAreaId, setPolyAreaId] = useState('');
  const [polyTeacherId, setPolyTeacherId] = useState('');
  const [isPolyModalOpen, setIsPolyModalOpen] = useState(false);

  const { data: assignments = [], isLoading: loadingAssignments } = useCourseAssignments();
  const { data: classrooms = [] } = useClassrooms();
  const { data: areas = [] } = useCurricularAreas();
  const { data: teachers = [] } = useUsers('TEACHER');

  const { mutateAsync: createAssignment, isPending: isCreating } = useCreateCourseAssignment();
  const { mutateAsync: bulkAssign, isPending: isBulkAssigning } = useBulkAssignUnidocente();
  const { mutateAsync: deleteAssignment } = useDeleteCourseAssignment();

  // Aulas unidocentes: Inicial y Primaria 1°-3°
  const unidocenteClassrooms = classrooms.filter(
    (c) =>
      c.educationLevel === 'INITIAL' ||
      (c.educationLevel === 'PRIMARY' && c.grade <= 3),
  );

  // Filtrar asignaciones por nivel
  const filteredAssignments = assignments.filter(
    (a) => levelFilter === 'ALL' || a.classroom.educationLevel === levelFilter,
  );

  // Áreas de un aula seleccionada (para unidocente)
  const areasForUniClassroom = useMemo(() => {
    if (!uniClassroomId) return [];
    const classroom = classrooms.find((c) => c.id === uniClassroomId);
    if (!classroom) return [];
    return areas.filter((a) => a.isActive);
  }, [uniClassroomId, areas, classrooms]);

  const handleBulkAssign = async () => {
    if (!uniClassroomId || !uniTeacherId || areasForUniClassroom.length === 0) {
      toast.error('Selecciona un aula, una docente y asegúrate de tener cursos configurados.');
      return;
    }
    try {
      const result = await bulkAssign({
        classroomId: uniClassroomId,
        teacherId: uniTeacherId,
        areaIds: areasForUniClassroom.map((a) => a.id),
      });
      toast.success(result.message || 'Asignación Unidocencia completada.');
      setUniClassroomId('');
      setUniTeacherId('');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al asignar.');
    }
  };

  const handlePolyAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createAssignment({
        classroomId: polyClassroomId,
        areaId: polyAreaId,
        teacherId: polyTeacherId,
      });
      const area = areas.find((a) => a.id === polyAreaId);
      const classroom = classrooms.find((c) => c.id === polyClassroomId);
      toast.success(`✅ ${area?.name} asignado en ${classroom?.grade}° "${classroom?.section}".`);
      setIsPolyModalOpen(false);
    } catch (err: any) {
      if (err?.response?.status === 409) {
        toast.error('Este curso en esta aula ya tiene un docente asignado.');
      } else {
        toast.error(err?.response?.data?.message || 'Error al crear la asignación.');
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar esta asignación docente?')) return;
    try {
      await deleteAssignment(id);
      toast.success('Asignación eliminada.');
    } catch {
      toast.error('Error al eliminar la asignación.');
    }
  };

  const getTeacherName = (teacher: { firstName: string; lastNamePaternal: string; lastNameMaternal: string }) =>
    `${teacher.firstName} ${teacher.lastNamePaternal} ${teacher.lastNameMaternal}`;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Carga Horaria y Asignación Docente
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Asigna docentes a sus cursos y aulas. Define la modalidad de cada nivel educativo.
          </p>
        </div>
        <Button
          size="sm"
          className="gap-2 text-xs"
          onClick={() => {
            setIsPolyModalOpen(true);
            setPolyClassroomId('');
            setPolyAreaId('');
            setPolyTeacherId('');
          }}
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Asignación (Polidocencia)</span>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Total Asignaciones</CardTitle>
            <BookOpen className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-foreground">{assignments.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Cursos con docente asignado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Docentes con Carga</CardTitle>
            <GraduationCap className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {new Set(assignments.map((a) => a.teacherId)).size}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Profesores con al menos 1 curso</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Sin Asignar</CardTitle>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
              {teachers.length - new Set(assignments.map((a) => a.teacherId)).size}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Docentes sin carga asignada</p>
          </CardContent>
        </Card>
      </div>

      {/* Asistente Unidocencia */}
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          <h2 className="text-sm font-bold text-amber-700 dark:text-amber-300">
            Asistente Unidocencia — Inicial y Primaria 1° a 3°
          </h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Selecciona el aula y la profesora. Se asignará automáticamente a <strong>todos los cursos</strong> del aula en un solo clic.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Aula (Unidocencia)</label>
            <select
              value={uniClassroomId}
              onChange={(e) => setUniClassroomId(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">── Seleccionar aula ──</option>
              {unidocenteClassrooms.map((c) => (
                <option key={c.id} value={c.id}>
                  {LEVEL_LABEL[c.educationLevel]} {c.grade}° "{c.section}"
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Profesora de Aula</label>
            <select
              value={uniTeacherId}
              onChange={(e) => setUniTeacherId(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">── Seleccionar docente ──</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.firstName} {t.lastNamePaternal}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button
              className="w-full gap-2 text-xs bg-amber-500 hover:bg-amber-600 text-white font-bold"
              onClick={handleBulkAssign}
              disabled={isBulkAssigning || !uniClassroomId || !uniTeacherId}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isBulkAssigning ? 'Asignando...' : 'Asignar (Todos los Cursos)'}</span>
            </Button>
          </div>
        </div>
        {uniClassroomId && (
          <p className="text-xs text-muted-foreground">
            Se asignarán <strong className="text-foreground">{areasForUniClassroom.length} cursos</strong> al docente seleccionado.
            {areasForUniClassroom.length === 0 && (
              <span className="text-amber-600 ml-1">⚠ Configura primero los cursos en la sección "Cursos y Áreas SIAGIE".</span>
            )}
          </p>
        )}
      </div>

      {/* Filtro por Nivel */}
      <div className="flex items-center gap-1 border-b border-border overflow-x-auto pb-0 -mb-px">
        {(['ALL', 'INITIAL', 'PRIMARY', 'SECONDARY'] as LevelFilter[]).map((level) => (
          <button
            key={level}
            onClick={() => setLevelFilter(level)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap -mb-px ${
              levelFilter === level
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>
              {level === 'ALL' ? 'Todas las Asignaciones' : LEVEL_LABEL[level]}
            </span>
          </button>
        ))}
      </div>

      {/* Lista de Asignaciones */}
      {loadingAssignments ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      ) : filteredAssignments.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-border rounded-xl bg-card space-y-3">
          <UserCheck className="w-10 h-10 text-primary mx-auto opacity-70" />
          <div className="space-y-1">
            <h3 className="font-bold text-base text-foreground">No hay asignaciones docentes aún</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Usa el <strong>Asistente Unidocencia</strong> para Inicial y Primaria baja, o el botón <strong>"Nueva Asignación"</strong> para polidocencia.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredAssignments.map((assignment) => {
            const isUnidocente =
              assignment.classroom.educationLevel === 'INITIAL' ||
              (assignment.classroom.educationLevel === 'PRIMARY' && assignment.classroom.grade <= 3);

            return (
              <div
                key={assignment.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/40 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-2 h-10 rounded-full shrink-0 ${
                    assignment.classroom.educationLevel === 'INITIAL'
                      ? 'bg-amber-500'
                      : assignment.classroom.educationLevel === 'PRIMARY'
                      ? 'bg-sky-500'
                      : 'bg-purple-500'
                  }`} />
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-foreground">
                        {assignment.area.name}
                      </span>
                      {assignment.area.officialCode && (
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {assignment.area.officialCode}
                        </Badge>
                      )}
                      <Badge
                        variant="secondary"
                        className={`text-[10px] font-bold ${
                          isUnidocente
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                            : 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
                        }`}
                      >
                        {isUnidocente ? 'Unidocencia' : 'Polidocencia'}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <SchoolIcon className="w-3 h-3" />
                      <span>
                        {LEVEL_LABEL[assignment.classroom.educationLevel]} {assignment.classroom.grade}° "{assignment.classroom.section}"
                      </span>
                      <span className="text-border">•</span>
                      <GraduationCap className="w-3 h-3" />
                      <span>{getTeacherName(assignment.teacher)}</span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-destructive hover:bg-destructive/10 self-end sm:self-auto"
                  onClick={() => handleDelete(assignment.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Asignación Polidocencia */}
      {isPolyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-primary" />
              <span>Nueva Asignación — Polidocencia</span>
            </h2>

            <form onSubmit={handlePolyAssign} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Aula</label>
                <select
                  required
                  value={polyClassroomId}
                  onChange={(e) => setPolyClassroomId(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">── Seleccionar aula ──</option>
                  {classrooms.map((c) => (
                    <option key={c.id} value={c.id}>
                      {LEVEL_LABEL[c.educationLevel]} {c.grade}° "{c.section}"
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Curso / Área Curricular</label>
                <select
                  required
                  value={polyAreaId}
                  onChange={(e) => setPolyAreaId(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">── Seleccionar curso ──</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} {a.officialCode ? `(${a.officialCode})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Docente Asignado</label>
                <select
                  required
                  value={polyTeacherId}
                  onChange={(e) => setPolyTeacherId(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">── Seleccionar docente ──</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.firstName} {t.lastNamePaternal} {t.lastNameMaternal}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button type="button" variant="ghost" size="sm" onClick={() => setIsPolyModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" size="sm" isLoading={isCreating} className="font-bold gap-2">
                  <span>Guardar Asignación</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
