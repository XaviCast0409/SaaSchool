import React, { useState, useMemo, useEffect } from 'react';
import {
  UserCheck,
  Search,
  BookOpen,
  Users,
  Layers,
  GraduationCap,
  AlertTriangle,
  Sparkles,
  Save,
  Check,
  Lock,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Filter,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import {
  useCourseAssignments,
  useSyncTeacherAssignments,
  type CourseAssignment,
} from '../api/useCourseAssignments';
import { useClassrooms } from '@/features/classrooms/api/useClassrooms';
import { useCurricularAreas } from '@/features/curricular-areas/api/useCurricularAreas';
import { useUsers } from '@/features/users/api/useUsers';
import { useAuthStore } from '@/store/useAuthStore';
import { TeacherMyCoursesView } from '../components/TeacherMyCoursesView';
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

export function getAreaLevel(area: { name: string; officialCode?: string | null }): 'INITIAL' | 'PRIMARY' | 'SECONDARY' {
  const code = (area.officialCode || '').toUpperCase();
  const name = (area.name || '').toLowerCase();

  if (code.includes('-INI') || code.startsWith('INI-') || name.includes('inicial')) {
    return 'INITIAL';
  }
  if (code.includes('-PRI') || code.startsWith('PRI-') || name.includes('primaria')) {
    return 'PRIMARY';
  }
  if (
    code.includes('-SEC') ||
    code.startsWith('MAT-') ||
    code.startsWith('COM-') ||
    code.startsWith('CCSS-') ||
    code.startsWith('CT-') ||
    code.startsWith('DPCC-') ||
    code.startsWith('EPT-') ||
    code.startsWith('AYC-') ||
    code.startsWith('EF-') ||
    code.startsWith('ER-') ||
    code.startsWith('TOE-') ||
    code.startsWith('RAZ-') ||
    name.includes('secundaria')
  ) {
    return 'SECONDARY';
  }

  return 'PRIMARY';
}

const AdminTeacherAssignmentsView: React.FC = () => {
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [searchTeacher, setSearchTeacher] = useState<string>('');
  const [searchClassroom, setSearchClassroom] = useState<string>('');
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('ALL');

  // Control de expansión de acordeones por aula
  const [collapsedClassroomIds, setCollapsedClassroomIds] = useState<Set<string>>(new Set());

  // Estado local del Checklist para el profesor seleccionado (keys: "${classroomId}:${areaId}")
  const [localCheckedKeys, setLocalCheckedKeys] = useState<Set<string>>(new Set());

  // Data Queries
  const { data: assignments = [], isLoading: loadingAssignments } = useCourseAssignments();
  const { data: classrooms = [], isLoading: loadingClassrooms } = useClassrooms();
  const { data: areas = [], isLoading: loadingAreas } = useCurricularAreas();
  const { data: teachers = [], isLoading: loadingTeachers } = useUsers('TEACHER');

  const { mutateAsync: syncTeacher, isPending: isSyncing } = useSyncTeacherAssignments();

  // Filtrar profesores por búsqueda por nombre
  const filteredTeachers = useMemo(() => {
    const q = searchTeacher.toLowerCase().trim();
    if (!q) return teachers;
    return teachers.filter(
      (t) =>
        t.firstName.toLowerCase().includes(q) ||
        t.lastNamePaternal.toLowerCase().includes(q) ||
        (t.lastNameMaternal && t.lastNameMaternal.toLowerCase().includes(q)) ||
        t.email.toLowerCase().includes(q),
    );
  }, [teachers, searchTeacher]);

  // Profesor seleccionado actualmente
  const selectedTeacher = useMemo(() => {
    return teachers.find((t) => t.id === selectedTeacherId) || null;
  }, [teachers, selectedTeacherId]);

  // Mapa global de asignaciones actuales: key "${classroomId}:${areaId}" -> Assignment info
  const currentAssignmentMap = useMemo(() => {
    const map = new Map<string, CourseAssignment>();
    for (const a of assignments) {
      map.set(`${a.classroomId}:${a.areaId}`, a);
    }
    return map;
  }, [assignments]);

  // Inicializar/sincronizar el checklist cuando se selecciona un docente
  useEffect(() => {
    if (!selectedTeacherId) {
      setLocalCheckedKeys(new Set());
      return;
    }
    const teacherKeys = new Set<string>();
    for (const a of assignments) {
      if (a.teacherId === selectedTeacherId) {
        teacherKeys.add(`${a.classroomId}:${a.areaId}`);
      }
    }
    setLocalCheckedKeys(teacherKeys);
  }, [selectedTeacherId, assignments]);

  // Cursos asignados por profesor
  const teacherCourseCountMap = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of assignments) {
      counts.set(a.teacherId, (counts.get(a.teacherId) || 0) + 1);
    }
    return counts;
  }, [assignments]);

  // Filtrar aulas por nivel y por término de búsqueda (grado, sección o asignatura)
  const filteredClassrooms = useMemo(() => {
    const q = searchClassroom.toLowerCase().trim();
    return classrooms.filter((c) => {
      const matchLevel = levelFilter === 'ALL' || c.educationLevel === levelFilter;
      if (!matchLevel) return false;
      if (!q) return true;

      const classroomText = `${LEVEL_LABEL[c.educationLevel]} ${c.grade} ${c.section}`.toLowerCase();
      if (classroomText.includes(q)) return true;

      // Buscar si alguna materia del aula coincide con el término
      const levelAreas = areas.filter((a) => getAreaLevel(a) === c.educationLevel);
      return levelAreas.some((a) => a.name.toLowerCase().includes(q) || (a.officialCode || '').toLowerCase().includes(q));
    });
  }, [classrooms, levelFilter, searchClassroom, areas]);

  // Conmutar expansión de un aula
  const toggleClassroomCollapse = (classroomId: string) => {
    setCollapsedClassroomIds((prev) => {
      const next = new Set(prev);
      if (next.has(classroomId)) {
        next.delete(classroomId);
      } else {
        next.add(classroomId);
      }
      return next;
    });
  };

  const collapseAllClassrooms = () => {
    setCollapsedClassroomIds(new Set(classrooms.map((c) => c.id)));
  };

  const expandAllClassrooms = () => {
    setCollapsedClassroomIds(new Set());
  };

  // Conmutar un checkbox de materia
  const toggleCheck = (classroomId: string, areaId: string) => {
    const key = `${classroomId}:${areaId}`;
    setLocalCheckedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Asistente Unidocencia Rápido
  const handleQuickUnidocencia = (classroomId: string) => {
    if (!selectedTeacherId) return;
    const classroom = classrooms.find((c) => c.id === classroomId);
    if (!classroom) return;

    const levelAreas = areas.filter((a) => getAreaLevel(a) === classroom.educationLevel);
    const generalAreas = levelAreas.filter((a) => {
      const code = (a.officialCode || '').toUpperCase();
      const name = a.name.toLowerCase();
      return (
        !code.includes('ING') &&
        !code.includes('EF') &&
        !code.includes('EPT') &&
        !code.includes('AYC') &&
        !name.includes('inglés') &&
        !name.includes('física') &&
        !name.includes('computación') &&
        !name.includes('arte')
      );
    });

    setLocalCheckedKeys((prev) => {
      const next = new Set(prev);
      for (const area of generalAreas) {
        next.add(`${classroomId}:${area.id}`);
      }
      return next;
    });

    toast.info(`Se marcaron ${generalAreas.length} materias generales para ${classroom.grade}° "${classroom.section}".`);
  };

  // Guardar la carga horaria completa del profesor
  const handleSaveAssignments = async () => {
    if (!selectedTeacherId || !selectedTeacher) return;

    const desiredAssignments = Array.from(localCheckedKeys).map((key) => {
      const [classroomId, areaId] = key.split(':');
      return { classroomId, areaId };
    });

    try {
      const result = await syncTeacher({
        teacherId: selectedTeacherId,
        assignments: desiredAssignments,
      });
      toast.success(result.message || `Carga horaria de ${selectedTeacher.firstName} guardada con éxito.`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al guardar la carga horaria.');
    }
  };

  const getTeacherFullName = (t: { firstName: string; lastNamePaternal: string; lastNameMaternal?: string }) =>
    `${t.firstName} ${t.lastNamePaternal} ${t.lastNameMaternal || ''}`.trim();

  const isLoadingAll = loadingAssignments || loadingClassrooms || loadingAreas || loadingTeachers;

  return (
    <div className="space-y-6 pb-12">
      {/* Header General */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Carga Horaria Docente (Checklist por Profesor)
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Gestión optimizada con encabezado fijo, acordeones plegables y buscador rápido de aulas.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Total Cursos Asignados</CardTitle>
            <BookOpen className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-foreground">{assignments.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Asignaciones docentes activas</p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Docentes con Carga</CardTitle>
            <GraduationCap className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {new Set(assignments.map((a) => a.teacherId)).size} de {teachers.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Profesores con cursos a su cargo</p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Docentes Sin Carga</CardTitle>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
              {Math.max(0, teachers.length - new Set(assignments.map((a) => a.teacherId)).size)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Profesores disponibles para asignar</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Layout Grid: 2 Columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Columna Izquierda: Buscador & Selección de Profesor (Sticky en Pantallas Grandes) */}
        <div className="lg:col-span-4 lg:sticky lg:top-4 space-y-4 self-start">
          <Card className="bg-card shadow-sm border border-border">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <span>1. Selecciona un Profesor</span>
              </CardTitle>
              <div className="relative mt-2">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar por nombre o correo..."
                  value={searchTeacher}
                  onChange={(e) => setSearchTeacher(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background pl-9 pr-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </CardHeader>
            <CardContent className="p-2 space-y-1.5 max-h-[calc(100vh-280px)] overflow-y-auto">
              {isLoadingAll ? (
                <div className="space-y-2 p-2">
                  <Skeleton className="h-14 w-full rounded-xl" />
                  <Skeleton className="h-14 w-full rounded-xl" />
                  <Skeleton className="h-14 w-full rounded-xl" />
                </div>
              ) : filteredTeachers.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No se encontraron profesores.
                </div>
              ) : (
                filteredTeachers.map((teacher) => {
                  const count = teacherCourseCountMap.get(teacher.id) || 0;
                  const isSelected = selectedTeacherId === teacher.id;

                  return (
                    <button
                      key={teacher.id}
                      onClick={() => setSelectedTeacherId(teacher.id)}
                      className={`w-full text-left p-3 rounded-xl transition-all border ${
                        isSelected
                          ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary'
                          : 'border-border bg-card hover:border-primary/40 hover:bg-accent/40'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            isSelected ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                          }`}>
                            {teacher.firstName.charAt(0)}
                            {teacher.lastNamePaternal.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-xs text-foreground truncate">
                              {getTeacherFullName(teacher)}
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate">
                              {teacher.email}
                            </div>
                          </div>
                        </div>

                        <Badge
                          variant={count > 0 ? 'default' : 'outline'}
                          className={`text-[10px] shrink-0 font-bold ${
                            count > 0 ? 'bg-emerald-500 text-white' : 'text-muted-foreground'
                          }`}
                        >
                          {count} {count === 1 ? 'curso' : 'cursos'}
                        </Badge>
                      </div>
                    </button>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Columna Derecha: Matriz Checklist por Aula */}
        <div className="lg:col-span-8 space-y-4">
          {!selectedTeacher ? (
            <Card className="bg-card border-dashed">
              <CardContent className="py-24 text-center space-y-3">
                <UserCheck className="w-12 h-12 text-primary mx-auto opacity-40" />
                <div className="space-y-1">
                  <h3 className="font-bold text-base text-foreground">Ningún profesor seleccionado</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Haz clic en cualquier docente del panel izquierdo para cargar la matriz interactiva de asignación.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4 relative">
              {/* STICKY HEADER BANNER: Permanece fijo arriba para guardar sin tener que hacer scroll de regreso */}
              <div className="sticky top-0 z-30 bg-card/95 backdrop-blur-md border border-primary/30 p-4 rounded-2xl shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-extrabold text-sm shrink-0 shadow-md">
                    {selectedTeacher.firstName.charAt(0)}
                    {selectedTeacher.lastNamePaternal.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-primary">Carga Horaria Activa</div>
                    <div className="text-base font-extrabold text-foreground truncate">
                      {getTeacherFullName(selectedTeacher)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{localCheckedKeys.size}</strong> cursos marcados para asignación
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1.5 h-9"
                    onClick={() => {
                      const teacherKeys = new Set<string>();
                      for (const a of assignments) {
                        if (a.teacherId === selectedTeacherId) {
                          teacherKeys.add(`${a.classroomId}:${a.areaId}`);
                        }
                      }
                      setLocalCheckedKeys(teacherKeys);
                      toast.info('Se restauraron los cambios no guardados.');
                    }}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Deshacer</span>
                  </Button>

                  <Button
                    size="sm"
                    className="text-xs font-bold gap-2 h-9 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md flex-1 sm:flex-none"
                    onClick={handleSaveAssignments}
                    isLoading={isSyncing}
                  >
                    <Save className="w-4 h-4" />
                    <span>Guardar Carga Horaria</span>
                  </Button>
                </div>
              </div>

              {/* Barra de Filtro de Nivel & Buscador Interno de Aulas */}
              <div className="bg-card p-3 rounded-2xl border border-border space-y-3 shadow-sm">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  {/* Pestañas por Nivel */}
                  <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                    {(['ALL', 'INITIAL', 'PRIMARY', 'SECONDARY'] as LevelFilter[]).map((level) => (
                      <button
                        key={level}
                        onClick={() => setLevelFilter(level)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                          levelFilter === level
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>{level === 'ALL' ? 'Todas' : LEVEL_LABEL[level]}</span>
                      </button>
                    ))}
                  </div>

                  {/* Acciones de Acordeón */}
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={expandAllClassrooms}
                      className="h-7 text-[11px] px-2 text-muted-foreground gap-1"
                    >
                      <Maximize2 className="w-3 h-3" />
                      <span>Expandir todo</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={collapseAllClassrooms}
                      className="h-7 text-[11px] px-2 text-muted-foreground gap-1"
                    >
                      <Minimize2 className="w-3 h-3" />
                      <span>Colapsar todo</span>
                    </Button>
                  </div>
                </div>

                {/* Buscador Rápido de Aula o Asignatura */}
                <div className="relative">
                  <Filter className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder='Filtrar aulas o cursos... (Ej: "5°", "Matemática", "Primaria")'
                    value={searchClassroom}
                    onChange={(e) => setSearchClassroom(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background pl-8 pr-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Matriz Plegable de Aulas y Cursos */}
              {isLoadingAll ? (
                <div className="space-y-3">
                  <Skeleton className="h-28 w-full rounded-2xl" />
                  <Skeleton className="h-28 w-full rounded-2xl" />
                </div>
              ) : filteredClassrooms.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                  No se encontraron aulas con el filtro actual.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredClassrooms.map((classroom) => {
                    const isCollapsed = collapsedClassroomIds.has(classroom.id);

                    // Áreas del nivel de este aula
                    const levelAreas = areas.filter(
                      (a) => getAreaLevel(a) === classroom.educationLevel,
                    );

                    // Calcular cuántas asignaturas de este aula tiene marcadas el profesor seleccionado
                    const markedCountInClassroom = levelAreas.filter((area) =>
                      localCheckedKeys.has(`${classroom.id}:${area.id}`),
                    ).length;

                    const isUnidocenteClassroom =
                      classroom.educationLevel === 'INITIAL' ||
                      (classroom.educationLevel === 'PRIMARY' && classroom.grade <= 3);

                    return (
                      <Card key={classroom.id} className="bg-card overflow-hidden transition-all">
                        {/* Encabezado Plegable del Aula */}
                        <div
                          onClick={() => toggleClassroomCollapse(classroom.id)}
                          className="py-3 px-4 bg-muted/40 hover:bg-muted/70 cursor-pointer border-b border-border flex items-center justify-between transition-colors select-none"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                classroom.educationLevel === 'INITIAL'
                                  ? 'bg-amber-500'
                                  : classroom.educationLevel === 'PRIMARY'
                                  ? 'bg-sky-500'
                                  : 'bg-purple-500'
                              }`}
                            />
                            <h3 className="text-sm font-bold text-foreground truncate">
                              {LEVEL_LABEL[classroom.educationLevel]} {classroom.grade}° "{classroom.section}"
                            </h3>

                            <Badge
                              variant={markedCountInClassroom > 0 ? 'default' : 'outline'}
                              className={`text-[10px] font-bold shrink-0 ${
                                markedCountInClassroom > 0
                                  ? 'bg-emerald-600 text-white'
                                  : 'text-muted-foreground'
                              }`}
                            >
                              {markedCountInClassroom} / {levelAreas.length} asignadas
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {isUnidocenteClassroom && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-[10px] gap-1 text-primary hover:bg-primary/10 font-bold px-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQuickUnidocencia(classroom.id);
                                }}
                              >
                                <Sparkles className="w-3 h-3 text-amber-500" />
                                <span className="hidden sm:inline">Unidocencia General</span>
                              </Button>
                            )}

                            <div className="p-1 rounded-lg text-muted-foreground hover:bg-background">
                              {isCollapsed ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronUp className="w-4 h-4" />
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Cuerpo Desplegable */}
                        {!isCollapsed && (
                          <CardContent className="p-4 animate-in fade-in duration-150">
                            {levelAreas.length === 0 ? (
                              <p className="text-xs text-muted-foreground italic">
                                No hay materias configuradas para el nivel {LEVEL_LABEL[classroom.educationLevel]}.
                              </p>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {levelAreas.map((area) => {
                                  const key = `${classroom.id}:${area.id}`;
                                  const isChecked = localCheckedKeys.has(key);
                                  const currentAssignee = currentAssignmentMap.get(key);

                                  const isAssignedToOther =
                                    currentAssignee && currentAssignee.teacherId !== selectedTeacherId;

                                  return (
                                    <div
                                      key={area.id}
                                      onClick={() => toggleCheck(classroom.id, area.id)}
                                      className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 select-none ${
                                        isChecked
                                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100 shadow-sm'
                                          : isAssignedToOther
                                          ? 'border-amber-500/40 bg-amber-500/5 hover:border-amber-500'
                                          : 'border-border bg-card hover:border-primary/40'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <div
                                          className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors shrink-0 ${
                                            isChecked
                                              ? 'bg-emerald-600 border-emerald-600 text-white'
                                              : 'border-muted-foreground/40 bg-background'
                                          }`}
                                        >
                                          {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                        </div>
                                        <div className="min-w-0">
                                          <div className="font-bold text-xs text-foreground truncate">
                                            {area.name}
                                          </div>
                                          {area.officialCode && (
                                            <div className="text-[10px] font-mono text-muted-foreground">
                                              {area.officialCode}
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      {isAssignedToOther && !isChecked && (
                                        <Badge
                                          variant="outline"
                                          className="text-[9px] border-amber-500/40 text-amber-700 dark:text-amber-300 gap-1 bg-amber-500/10 shrink-0 font-medium"
                                          title={`Asignado a ${getTeacherFullName(currentAssignee.teacher)}`}
                                        >
                                          <Lock className="w-2.5 h-2.5" />
                                          <span className="truncate max-w-[90px]">
                                            {currentAssignee.teacher.firstName}
                                          </span>
                                        </Badge>
                                      )}

                                      {isAssignedToOther && isChecked && (
                                        <Badge
                                          variant="default"
                                          className="text-[9px] bg-amber-500 text-white gap-1 shrink-0 font-bold"
                                        >
                                          <Sparkles className="w-2.5 h-2.5" />
                                          <span>Reasignará</span>
                                        </Badge>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </CardContent>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const TeacherAssignmentsPage: React.FC = () => {
  const { user } = useAuthStore();
  if (user?.role === 'TEACHER') {
    return <TeacherMyCoursesView />;
  }
  return <AdminTeacherAssignmentsView />;
};
