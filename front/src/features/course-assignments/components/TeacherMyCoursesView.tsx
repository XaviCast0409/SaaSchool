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
  LayoutGrid,
  List,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useMyCourseAssignments } from '../api/useCourseAssignments';
import { useAuthStore } from '@/store/useAuthStore';
import { getSubjectTheme } from '@/features/course-contents/utils/subjectThemes';
import { Card, CardContent } from '@/components/ui/card';
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

export const TeacherMyCoursesView: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { data: myCourses = [], isLoading } = useMyCourseAssignments();

  const [selectedEducationLevel, setSelectedEducationLevel] = useState<string>('ALL');
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState<number>(1);
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

  // Niveles educativos únicos del profesor
  const availableLevels = useMemo(() => {
    const set = new Set<string>();
    myCourses.forEach((c) => set.add(c.classroom.educationLevel));
    return Array.from(set).sort();
  }, [myCourses]);

  // Aulas únicas con conteo de asignaturas por aula
  const availableClassrooms = useMemo(() => {
    const map = new Map<string, { id: string; grade: number; section: string; educationLevel: string; count: number }>();
    myCourses.forEach((c) => {
      if (selectedEducationLevel !== 'ALL' && c.classroom.educationLevel !== selectedEducationLevel) {
        return;
      }
      const existing = map.get(c.classroomId);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(c.classroomId, {
          id: c.classroomId,
          grade: c.classroom.grade,
          section: c.classroom.section,
          educationLevel: c.classroom.educationLevel,
          count: 1,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => {
      if (a.educationLevel !== b.educationLevel) return a.educationLevel.localeCompare(b.educationLevel);
      if (a.grade !== b.grade) return a.grade - b.grade;
      return a.section.localeCompare(b.section);
    });
  }, [myCourses, selectedEducationLevel]);

  // Filtrado reactivo de cursos asignados
  const filteredCourses = useMemo(() => {
    return myCourses.filter((course) => {
      if (selectedEducationLevel !== 'ALL' && course.classroom.educationLevel !== selectedEducationLevel) {
        return false;
      }
      if (selectedClassroomId && course.classroomId !== selectedClassroomId) {
        return false;
      }
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
  }, [myCourses, selectedEducationLevel, selectedClassroomId, searchQuery]);

  // Paginación eficiente: 6 cursos por página en Cuadrícula u 8 en Lista
  const pageSize = viewMode === 'grid' ? 6 : 8;
  const totalPages = Math.max(1, Math.ceil(filteredCourses.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const paginatedCourses = useMemo(() => {
    const startIndex = (validCurrentPage - 1) * pageSize;
    return filteredCourses.slice(startIndex, startIndex + pageSize);
  }, [filteredCourses, validCurrentPage, pageSize]);

  // Aula seleccionada activa (para banner informativo)
  const activeClassroom = useMemo(() => {
    return availableClassrooms.find((c) => c.id === selectedClassroomId);
  }, [availableClassrooms, selectedClassroomId]);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-150">
      {/* 1. Header Banner */}
      <div className="p-5 sm:p-7 rounded-2xl bg-card border border-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Badge className="bg-primary/10 text-primary border-primary/20 gap-1 text-[11px] font-bold">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Carga Horaria Docente</span>
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
            Mis Cursos Asignados
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Prof. {user?.firstName} {user?.lastNamePaternal} • Publica materiales en el aula virtual y registra calificaciones.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
          <Button
            onClick={() => navigate('/grades')}
            className="gap-2 text-xs font-bold rounded-xl h-10 px-4 shadow-sm"
          >
            <BookOpenCheck className="w-4 h-4" />
            <span>Registro General de Notas</span>
          </Button>
        </div>
      </div>

      {/* 2. KPIs Rápidos del Docente */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Asignaturas</p>
              <p className="text-xl sm:text-2xl font-black text-foreground">{totalCourses}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Cursos a tu cargo</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
              <School className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Aulas Asignadas</p>
              <p className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-300">{uniqueClassrooms}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Secciones activas</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm col-span-2 sm:col-span-1">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-700 dark:text-violet-300 flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Aula Virtual</p>
              <p className="text-base sm:text-lg font-black text-foreground">Almacenamiento Cloud</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Recursos digitales listos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2.1 Selector de Nivel Educativo (si enseña en más de un nivel) */}
      {availableLevels.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-muted-foreground mr-1">Nivel Educativo:</span>
          <button
            onClick={() => {
              setSelectedEducationLevel('ALL');
              setSelectedClassroomId('');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              selectedEducationLevel === 'ALL'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-card border border-border text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            Todos los Niveles ({totalCourses})
          </button>
          {availableLevels.map((lvl) => (
            <button
              key={lvl}
              onClick={() => {
                setSelectedEducationLevel(lvl);
                setSelectedClassroomId('');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                selectedEducationLevel === lvl
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-card border border-border text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {LEVEL_LABEL[lvl] || lvl}
            </button>
          ))}
        </div>
      )}

      {/* 2.2 Pestañas Rápidas de Aulas Asignadas con conteo */}
      {availableClassrooms.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-bold flex items-center gap-1.5">
              <School className="w-3.5 h-3.5 text-primary" />
              <span>Aulas y Secciones a tu cargo</span>
            </span>
            <span>{availableClassrooms.length} aulas activas</span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => {
                setSelectedClassroomId('');
                setCurrentPage(1);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 flex items-center gap-2 ${
                selectedClassroomId === ''
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-card border border-border text-foreground hover:bg-muted/80'
              }`}
            >
              <span>Todas las Aulas</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                  selectedClassroomId === ''
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {filteredCourses.length}
              </span>
            </button>

            {availableClassrooms.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setSelectedClassroomId(c.id);
                  setCurrentPage(1);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 flex items-center gap-2 ${
                  selectedClassroomId === c.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-card border border-border text-foreground hover:bg-muted/80'
                }`}
              >
                <span>
                  {c.grade}° "{c.section}" • {LEVEL_LABEL[c.educationLevel] || c.educationLevel}
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                    selectedClassroomId === c.id
                      ? 'bg-primary-foreground/20 text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {c.count} {c.count === 1 ? 'curso' : 'cursos'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3. Barra de Búsqueda y Filtros */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-card border border-border shadow-sm">
        {/* Selector Dropdown de Aula (útil para listas muy largas) */}
        <div className="flex items-center gap-2 bg-background px-3 h-9 rounded-xl border border-input min-w-[240px]">
          <School className="w-4 h-4 text-primary shrink-0" />
          <select
            value={selectedClassroomId}
            onChange={(e) => {
              setSelectedClassroomId(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full border-none bg-transparent text-xs font-semibold focus:outline-none text-foreground cursor-pointer"
          >
            <option value="">— Todas las Aulas ({availableClassrooms.length}) —</option>
            {availableClassrooms.map((c) => (
              <option key={c.id} value={c.id}>
                {c.grade}° "{c.section}" — {LEVEL_LABEL[c.educationLevel] || c.educationLevel} ({c.count} cursos)
              </option>
            ))}
          </select>
        </div>

        {/* Buscador de Asignatura */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar por curso o código oficial..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-9 pr-8 h-9 text-xs bg-background rounded-xl"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setCurrentPage(1);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Toggle Grid / List */}
        <div className="flex items-center border border-border rounded-xl p-0.5 bg-muted/40 self-end sm:self-auto shrink-0">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === 'grid' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
            }`}
            title="Vista Cuadrícula"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === 'list' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
            }`}
            title="Vista Lista"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Banner Informativo cuando se selecciona un Aula */}
      {activeClassroom && (
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-primary/10 border border-primary/20 text-xs text-foreground">
          <div className="flex items-center gap-2 flex-wrap">
            <School className="w-4 h-4 text-primary shrink-0" />
            <span className="font-bold">
              Mostrando asignaturas de {activeClassroom.grade}° "{activeClassroom.section}" • {LEVEL_LABEL[activeClassroom.educationLevel] || activeClassroom.educationLevel}
            </span>
            <Badge variant="secondary" className="text-[10px] font-bold">
              {filteredCourses.length} {filteredCourses.length === 1 ? 'materia' : 'materias'}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedClassroomId('');
              setCurrentPage(1);
            }}
            className="h-7 px-2.5 text-xs font-bold text-primary hover:bg-primary/10 rounded-lg"
          >
            Ver todas las aulas
          </Button>
        </div>
      )}

      {/* 4. Grid de Cursos Asignados */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-44 w-full rounded-2xl" />
          ))}
        </div>
      ) : myCourses.length === 0 ? (
        <Card className="p-10 text-center border-dashed border-border bg-card">
          <Layers className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="text-base font-bold text-foreground">Aún no tienes cursos asignados</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
            La dirección académica aún no ha configurado tu carga horaria docente para este año escolar.
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
            className="mt-3 text-xs font-bold rounded-xl"
          >
            Restablecer Filtros
          </Button>
        </Card>
      ) : (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
              : 'space-y-3'
          }
        >
          {paginatedCourses.map((course) => {
            const theme = getSubjectTheme(course.area.name);
            const IconComponent = theme.icon;
            const competenciesCount = course.area.competences?.length ?? 0;

            if (viewMode === 'list') {
              return (
                <Card
                  key={course.id}
                  className="bg-card border-border hover:border-primary/40 hover:shadow-md transition-all duration-200"
                >
                  <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={`text-[10px] font-bold py-0 h-4 ${theme.badgeStyle}`}>
                            {theme.category}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px] font-bold py-0 h-4">
                            {course.classroom.grade}° "{course.classroom.section}" • {LEVEL_LABEL[course.classroom.educationLevel]}
                          </Badge>
                        </div>
                        <h3 className="text-sm sm:text-base font-extrabold text-foreground truncate mt-1">
                          {course.area.name}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {competenciesCount} competencias CNEB
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
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
                        className="text-xs font-bold gap-1.5 rounded-xl border-primary/30 text-primary hover:bg-primary/10 h-9"
                      >
                        <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                        <span>Aula Virtual</span>
                      </Button>

                      <Button
                        onClick={() =>
                          navigate(`/grades?courseAssignmentId=${course.id}&classroomId=${course.classroomId}`)
                        }
                        size="sm"
                        className="text-xs font-bold gap-1.5 shadow-sm rounded-xl h-9 bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        <BookOpenCheck className="w-3.5 h-3.5 shrink-0" />
                        <span>Notas</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            }

            return (
              <Card
                key={course.id}
                className="bg-card border-border hover:border-primary/40 hover:shadow-lg transition-all duration-200 flex flex-col justify-between overflow-hidden"
              >
                <div className="p-4 sm:p-5 space-y-3.5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <div>
                          <Badge variant="outline" className={`text-[10px] font-bold py-0.5 ${theme.badgeStyle}`}>
                            {theme.category}
                          </Badge>
                        </div>
                      </div>

                      <Badge variant="secondary" className="text-[10px] font-bold">
                        {LEVEL_LABEL[course.classroom.educationLevel]}
                      </Badge>
                    </div>

                    <h3 className="text-base font-extrabold text-foreground line-clamp-1 mt-1">
                      {course.area.name}
                    </h3>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2 pt-2 border-t border-border/50">
                      <School className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="font-bold text-foreground">
                        {course.classroom.grade}° "{course.classroom.section}"
                      </span>
                      <span>• Turno {course.classroom.shift === 'MORNING' ? 'Mañana' : 'Tarde'}</span>
                    </div>

                    {competenciesCount > 0 && (
                      <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-primary" />
                        <span>{competenciesCount} competencias CNEB configuradas</span>
                      </p>
                    )}
                  </div>

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
                      className="text-xs font-bold gap-1.5 border-primary/30 text-primary hover:bg-primary/10 rounded-xl h-9"
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
                      className="text-xs font-bold gap-1.5 shadow-sm rounded-xl h-9 bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      <BookOpenCheck className="w-3.5 h-3.5 shrink-0" />
                      <span>Notas</span>
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* 5. Barra de Paginación Inteligente */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border shadow-sm">
          <p className="text-xs text-muted-foreground">
            Mostrando <span className="font-bold text-foreground">{(validCurrentPage - 1) * pageSize + 1}–{Math.min(validCurrentPage * pageSize, filteredCourses.length)}</span> de <span className="font-bold text-foreground">{filteredCourses.length}</span> asignaturas
          </p>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={validCurrentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="h-8 px-3 text-xs font-bold gap-1 rounded-xl"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Anterior</span>
            </Button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
                <button
                  key={pageNumber}
                  onClick={() => setCurrentPage(pageNumber)}
                  className={`w-8 h-8 rounded-xl text-xs font-bold transition-colors ${
                    validCurrentPage === pageNumber
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-background border border-border text-foreground hover:bg-muted'
                  }`}
                >
                  {pageNumber}
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              disabled={validCurrentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="h-8 px-3 text-xs font-bold gap-1 rounded-xl"
            >
              <span>Siguiente</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Modal de Gestión de Aula Virtual */}
      <TeacherCourseContentsModal
        isOpen={!!selectedLmsAssignment}
        onClose={() => setSelectedLmsAssignment(null)}
        assignment={selectedLmsAssignment}
      />
    </div>
  );
};
