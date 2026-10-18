import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Search,
  FolderOpen,
} from 'lucide-react';
import type { StudentCourseAssignment, CourseContent, ContentType } from '../types';
import { useGetCourseContents } from '../api/useCourseContents';
import { getSubjectTheme } from '../utils/subjectThemes';
import { CourseContentCard } from './CourseContentCard';
import { ForumCommentsModal } from './ForumCommentsModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';

interface StudentCourseDetailViewProps {
  assignment: StudentCourseAssignment;
  classroomLabel: string;
  onBack: () => void;
}

export const StudentCourseDetailView: React.FC<StudentCourseDetailViewProps> = ({
  assignment,
  classroomLabel,
  onBack,
}) => {
  const [selectedBimester, setSelectedBimester] = useState<number>(1);
  const [filterType, setFilterType] = useState<ContentType | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeForumContent, setActiveForumContent] = useState<CourseContent | null>(null);

  const theme = getSubjectTheme(assignment.area.name);
  const IconComponent = theme.icon;

  const teacherFullName = assignment.teacher
    ? `${assignment.teacher.firstName} ${assignment.teacher.lastNamePaternal}`
    : 'Docente por asignar';
  const teacherInitials = assignment.teacher
    ? `${assignment.teacher.firstName[0]}${assignment.teacher.lastNamePaternal[0]}`.toUpperCase()
    : 'D';

  const { data: rawContents, isLoading } = useGetCourseContents(
    assignment.id,
    selectedBimester,
  );
  const contents = useMemo(() => (Array.isArray(rawContents) ? rawContents : []), [rawContents]);

  // Filtrado de publicaciones
  const filteredContents = useMemo(() => {
    return contents.filter((item) => {
      const matchesType = filterType === 'ALL' || item.contentType === filterType;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.fileName && item.fileName.toLowerCase().includes(q));
      return matchesType && matchesSearch;
    });
  }, [contents, filterType, searchQuery]);

  const materialsCount = contents.filter((c) => c.contentType === 'LESSON_MATERIAL').length;
  const homeworksCount = contents.filter((c) => c.contentType === 'HOMEWORK').length;
  const forumsCount = contents.filter((c) => c.contentType === 'FORUM').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-150 pb-12">
      {/* 1. Header de Navegación & Breadcrumb */}
      <div className="flex items-center justify-between gap-3">
        <Button
          onClick={onBack}
          variant="outline"
          size="sm"
          className="gap-2 font-bold text-xs rounded-xl shadow-sm hover:bg-secondary"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a Materias</span>
        </Button>

        <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold">
          <span>Aula Virtual</span>
          <span>/</span>
          <span className="text-foreground font-bold truncate max-w-[150px] sm:max-w-none">
            {assignment.area.name}
          </span>
        </div>
      </div>

      {/* 2. Banner de Portada del Curso */}
      <div className="p-5 sm:p-7 rounded-2xl bg-card border border-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-sm border border-primary/20">
            <IconComponent className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={`text-[10px] font-bold ${theme.badgeStyle}`}>
                {theme.category}
              </Badge>
              <Badge variant="secondary" className="text-[10px] font-bold">
                {classroomLabel}
              </Badge>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              {assignment.area.name}
            </h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
              <div className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-foreground">
                {teacherInitials}
              </div>
              <span>Prof. {teacherFullName}</span>
            </div>
          </div>
        </div>

        {/* Resumen de recursos del bimestre */}
        <div className="flex items-center gap-2 sm:gap-3 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6 shrink-0 flex-wrap">
          <div className="text-center px-3 py-1.5 rounded-xl bg-muted/40">
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Materiales</p>
            <p className="text-base sm:text-lg font-black text-foreground">{materialsCount}</p>
          </div>
          <div className="text-center px-3 py-1.5 rounded-xl bg-amber-500/10">
            <p className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase">Tareas</p>
            <p className="text-base sm:text-lg font-black text-amber-700 dark:text-amber-300">{homeworksCount}</p>
          </div>
          <div className="text-center px-3 py-1.5 rounded-xl bg-emerald-500/10">
            <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase">Foros</p>
            <p className="text-base sm:text-lg font-black text-emerald-700 dark:text-emerald-300">{forumsCount}</p>
          </div>
        </div>
      </div>

      {/* 3. Selector de Bimestres y Filtros */}
      <div className="space-y-3">
        {/* Selector de Bimestres */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {[1, 2, 3, 4].map((bim) => (
            <button
              key={bim}
              onClick={() => setSelectedBimester(bim)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 border ${
                selectedBimester === bim
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-card text-muted-foreground border-border hover:bg-secondary'
              }`}
            >
              <span>{bim}° Bimestre</span>
              {selectedBimester === bim && (
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0 h-4 bg-primary-foreground/20 text-primary-foreground"
                >
                  {contents.length}
                </Badge>
              )}
            </button>
          ))}
        </div>

        {/* Barra de Filtros y Búsqueda */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border">
          {/* Filter chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
            <Button
              size="sm"
              variant={filterType === 'ALL' ? 'default' : 'ghost'}
              onClick={() => setFilterType('ALL')}
              className="h-8 text-xs font-bold rounded-xl"
            >
              Todos ({contents.length})
            </Button>
            <Button
              size="sm"
              variant={filterType === 'LESSON_MATERIAL' ? 'default' : 'ghost'}
              onClick={() => setFilterType('LESSON_MATERIAL')}
              className="h-8 text-xs font-bold rounded-xl"
            >
              Materiales ({materialsCount})
            </Button>
            <Button
              size="sm"
              variant={filterType === 'HOMEWORK' ? 'default' : 'ghost'}
              onClick={() => setFilterType('HOMEWORK')}
              className="h-8 text-xs font-bold rounded-xl"
            >
              Tareas ({homeworksCount})
            </Button>
            <Button
              size="sm"
              variant={filterType === 'FORUM' ? 'default' : 'ghost'}
              onClick={() => setFilterType('FORUM')}
              className="h-8 text-xs font-bold rounded-xl"
            >
              Foros ({forumsCount})
            </Button>
          </div>

          {/* Search input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar en el curso..."
              className="pl-9 h-8 text-xs rounded-xl bg-background"
            />
          </div>
        </div>
      </div>

      {/* 4. Stream de Contenidos */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-44 w-full rounded-2xl" />
          ))}
        </div>
      ) : filteredContents.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-border rounded-2xl bg-card p-6">
          <FolderOpen className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-foreground">
            {searchQuery
              ? 'No se encontraron publicaciones con esa búsqueda'
              : `Sin publicaciones en el ${selectedBimester}° Bimestre`}
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
            {searchQuery
              ? 'Intenta con otro término o limpia el buscador.'
              : 'Tu docente compartirá diapositivas, lecturas o tareas para este bimestre.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredContents.map((item) => (
            <CourseContentCard
              key={item.id}
              content={item}
              canManage={false}
              onOpenForum={(c) => setActiveForumContent(c)}
            />
          ))}
        </div>
      )}

      {/* 5. Modal de Foro de Debate */}
      <ForumCommentsModal
        isOpen={!!activeForumContent}
        onClose={() => setActiveForumContent(null)}
        content={activeForumContent}
      />
    </div>
  );
};
