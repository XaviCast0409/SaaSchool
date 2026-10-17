import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  BookOpenCheck,
  GraduationCap,
  Layers,
  School,
  Search,
  X,
  Filter,
} from 'lucide-react';
import { useMyCourseAssignments } from '../api/useCourseAssignments';
import { useAuthStore } from '@/store/useAuthStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { TeacherCourseContentsModal } from '@/features/course-contents/components/TeacherCourseContentsModal';

const LEVEL_LABEL: Record<string, string> = {
  INITIAL: 'Inicial',
  PRIMARY: 'Primaria',
  SECONDARY: 'Secundaria',
};

const LEVEL_COLORS: Record<string, string> = {
  INITIAL: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30',
  PRIMARY: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  SECONDARY: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30',
};

export const TeacherMyCoursesView: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { data: myCourses = [], isLoading } = useMyCourseAssignments();

  // Estados de Filtros: únicamente Select de Aula/Grado y Buscador
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLmsAssignment, setSelectedLmsAssignment] = useState<{
    id: string;
    areaName: string;
    grade: number;
    section: string;
    educationLevel: string;
  } | null>(null);

  // Estadísticas del docente
  const totalCourses = myCourses.length;
  const uniqueClassrooms = new Set(myCourses.map((c) => c.classroomId)).size;
  const levels = Array.from(new Set(myCourses.map((c) => c.classroom.educationLevel)));

  // Aulas únicas en los cursos del profesor para el Select
  const availableClassrooms = useMemo(() => {
    const map = new Map<string, { id: string; grade: number; section: string; educationLevel: string }>();
    myCourses.forEach((c) => {
      if (!map.has(c.classroomId)) {
        map.set(c.classroomId, {
          id: c.classroomId,
          grade: c.classroom.grade,
          section: c.classroom.section,
          educationLevel: c.classroom.educationLevel,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => {
      if (a.educationLevel !== b.educationLevel) return a.educationLevel.localeCompare(b.educationLevel);
      if (a.grade !== b.grade) return a.grade - b.grade;
      return a.section.localeCompare(b.section);
    });
  }, [myCourses]);

  // Filtrado reactivo de cursos asignados
  const filteredCourses = useMemo(() => {
    return myCourses.filter((course) => {
      // 1. Filtro por Aula / Grado
      if (selectedClassroomId && course.classroomId !== selectedClassroomId) {
        return false;
      }
      // 2. Filtro por Búsqueda de texto
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const areaName = course.area.name.toLowerCase();
        const code = (course.area.officialCode || '').toLowerCase();
        const classroomText = `${course.classroom.grade} ${course.classroom.section}`.toLowerCase();
        const levelText = (LEVEL_LABEL[course.classroom.educationLevel] || '').toLowerCase();
        if (
          !areaName.includes(q) &&
          !code.includes(q) &&
          !classroomText.includes(q) &&
          !levelText.includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [myCourses, selectedClassroomId, searchQuery]);

  return (
    <div className="space-y-6 pb-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Mis Cursos Asignados
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Prof. {user?.firstName} {user?.lastNamePaternal} • Carga horaria académica oficial a tu cargo.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => navigate('/grades')}
            className="gap-2 text-xs font-bold shadow-sm"
          >
            <BookOpenCheck className="w-4 h-4" />
            <span>Registro General de Notas</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">
              Cursos / Asignaturas
            </CardTitle>
            <BookOpen className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-extrabold text-foreground">{totalCourses}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Materias asignadas</p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">
              Aulas Asignadas
            </CardTitle>
            <School className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {uniqueClassrooms}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Secciones activas</p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">
              Niveles Educativos
            </CardTitle>
            <GraduationCap className="w-4 h-4 text-sky-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-sm font-bold text-foreground truncate">
                {levels.length > 0
                  ? levels.map((l) => LEVEL_LABEL[l] || l).join(', ')
                  : 'Sin asignar'}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">CNEB / MINEDU</p>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros: Selector de Aula/Grado y Buscador */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-card border border-border shadow-sm">
        {/* Selector de Aula / Grado */}
        <div className="flex items-center gap-2 bg-background px-3 h-9 rounded-md border border-input min-w-[260px]">
          <School className="w-4 h-4 text-primary shrink-0" />
          <select
            value={selectedClassroomId}
            onChange={(e) => setSelectedClassroomId(e.target.value)}
            className="w-full border-none bg-transparent text-xs font-semibold focus:outline-none text-foreground cursor-pointer"
          >
            <option value="">— Selecciona un Aula / Grado —</option>
            {availableClassrooms.map((c) => (
              <option key={c.id} value={c.id}>
                {c.grade}° "{c.section}" — {LEVEL_LABEL[c.educationLevel] || c.educationLevel}
              </option>
            ))}
          </select>
        </div>

        {/* Buscador de Asignatura */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar curso o materia..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-8 h-9 text-xs bg-background"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              title="Limpiar búsqueda"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Grid de Cursos Asignados */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-44 w-full rounded-2xl" />
          ))}
        </div>
      ) : myCourses.length === 0 ? (
        <Card className="p-10 text-center border-dashed border-border bg-card">
          <Layers className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="text-base font-bold text-foreground">Aún no tienes cursos asignados</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
            La dirección académica o coordinación del colegio aún no ha configurado tu carga horaria docente para este año escolar.
          </p>
        </Card>
      ) : !selectedClassroomId && !searchQuery.trim() ? (
        <Card className="p-12 text-center border-dashed border-border bg-card">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
            <School className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-foreground">Selecciona un Aula para ver tus Cursos</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1.5 leading-relaxed">
            Tienes {uniqueClassrooms} {uniqueClassrooms === 1 ? 'aula asignada' : 'aulas asignadas'}. Elige un aula en el selector superior para visualizar sus asignaturas y gestionar el registro de notas sin sobrecargar la pantalla.
          </p>
        </Card>
      ) : filteredCourses.length === 0 ? (
        <Card className="p-10 text-center border-dashed border-border bg-card">
          <Filter className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-foreground">No se encontraron cursos con los filtros aplicados</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
            Intenta seleccionar otra aula o limpiar el término de búsqueda.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedClassroomId('');
              setSearchQuery('');
            }}
            className="mt-3 text-xs"
          >
            Restablecer Filtros
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCourses.map((course) => {
            const levelClass =
              LEVEL_COLORS[course.classroom.educationLevel] ||
              'bg-secondary text-secondary-foreground border-border';
            const competenciesCount = course.area.competences?.length ?? 0;

            return (
              <Card
                key={course.id}
                className="bg-card hover:border-primary/40 hover:shadow-md transition-all duration-200 flex flex-col justify-between"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <Badge variant="outline" className={`text-[10px] uppercase font-bold border ${levelClass}`}>
                      {LEVEL_LABEL[course.classroom.educationLevel]}
                    </Badge>
                    {course.area.officialCode && (
                      <span className="text-[11px] font-mono font-bold text-muted-foreground">
                        {course.area.officialCode}
                      </span>
                    )}
                  </div>
                  <CardTitle className="text-base font-bold text-foreground line-clamp-1 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-primary shrink-0" />
                    <span>{course.area.name}</span>
                  </CardTitle>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1.5 flex-wrap">
                    <div className="flex items-center gap-1 font-semibold text-foreground">
                      <School className="w-3.5 h-3.5 text-primary" />
                      <span>
                        {course.classroom.grade}° "{course.classroom.section}"
                      </span>
                    </div>
                    <span>• Turno {course.classroom.shift === 'MORNING' ? 'Mañana' : 'Tarde'}</span>
                    {competenciesCount > 0 && (
                      <span className="text-[11px] text-muted-foreground">
                        • {competenciesCount} competenc.
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="border-t border-border pt-3 grid grid-cols-2 gap-2">
                    <Button
                      onClick={() =>
                        setSelectedLmsAssignment({
                          id: course.id,
                          areaName: course.area.name,
                          grade: course.classroom.grade,
                          section: course.classroom.section,
                          educationLevel: LEVEL_LABEL[course.classroom.educationLevel] || course.classroom.educationLevel,
                        })
                      }
                      size="sm"
                      variant="outline"
                      className="text-xs font-bold gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                    >
                      <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                      <span>Aula Virtual</span>
                    </Button>

                    <Button
                      onClick={() =>
                        navigate(
                          `/grades?courseAssignmentId=${course.id}&classroomId=${course.classroomId}`,
                        )
                      }
                      size="sm"
                      className="text-xs font-bold gap-1.5 shadow-sm bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      <BookOpenCheck className="w-3.5 h-3.5 shrink-0" />
                      <span>Notas</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal de Gestión de Aula Virtual (Contenidos por Bimestre, Tareas y Foros) */}
      <TeacherCourseContentsModal
        isOpen={!!selectedLmsAssignment}
        onClose={() => setSelectedLmsAssignment(null)}
        assignment={selectedLmsAssignment}
      />
    </div>
  );
};
