import React, { useState, useMemo } from 'react';
import {
  X,
  Plus,
  BookOpen,
  School,
  FolderOpen,
  Search,
  Cloud,
  ClipboardList,
  MessageSquare,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import { useGetCourseContents, useDeleteCourseContent } from '../api/useCourseContents';
import type { CourseContent, ContentType } from '../types';
import { getSubjectTheme } from '../utils/subjectThemes';
import { CourseContentCard } from './CourseContentCard';
import { PublishContentModal } from './PublishContentModal';
import { ForumCommentsModal } from './ForumCommentsModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

interface CourseAssignmentMeta {
  id: string;
  areaName: string;
  grade: number;
  section: string;
  educationLevel: string;
}

interface TeacherCourseContentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: CourseAssignmentMeta | null;
}

export const TeacherCourseContentsModal: React.FC<TeacherCourseContentsModalProps> = ({
  isOpen,
  onClose,
  assignment,
}) => {
  const [selectedBimester, setSelectedBimester] = useState<number>(1);
  const [filterType, setFilterType] = useState<ContentType | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [initialContentType, setInitialContentType] = useState<ContentType>('LESSON_MATERIAL');
  const [activeForumContent, setActiveForumContent] = useState<CourseContent | null>(null);

  const { data: rawContents, isLoading } = useGetCourseContents(
    assignment?.id,
    selectedBimester,
  );
  const contents = useMemo(() => (Array.isArray(rawContents) ? rawContents : []), [rawContents]);
  const { mutateAsync: deleteContent } = useDeleteCourseContent();

  const theme = getSubjectTheme(assignment?.areaName || '');
  const IconComponent = theme.icon;

  // Filtrado reactivo de publicaciones por tipo y buscador
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

  // Contadores del bimestre activo
  const materialsCount = contents.filter((c) => c.contentType === 'LESSON_MATERIAL').length;
  const homeworksCount = contents.filter((c) => c.contentType === 'HOMEWORK').length;
  const forumsCount = contents.filter((c) => c.contentType === 'FORUM').length;

  if (!isOpen || !assignment) return null;

  const handleOpenPublish = (type: ContentType = 'LESSON_MATERIAL') => {
    setInitialContentType(type);
    setIsPublishModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Seguro que deseas eliminar esta publicación del aula virtual?')) return;
    try {
      await deleteContent({ id, courseAssignmentId: assignment.id });
      toast.success('Publicación eliminada correctamente');
    } catch {
      toast.error('Error al eliminar la publicación');
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
        <div className="w-full max-w-5xl bg-card border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[92vh] animate-in fade-in zoom-in-95 duration-200">
          {/* 1. Header con Identidad Visual Temática del Curso */}
          <div className="p-4 sm:p-6 border-b border-border bg-gradient-to-r from-card via-muted/20 to-card flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-sm border border-primary/20">
                <IconComponent className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={`text-[10px] font-bold py-0 h-4 ${theme.badgeStyle}`}>
                    {theme.category}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px] font-bold py-0 h-4">
                    {assignment.grade}° "{assignment.section}" • {assignment.educationLevel}
                  </Badge>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    <Cloud className="w-3 h-3" />
                    <span>Google Drive 5 TB</span>
                  </span>
                </div>

                <h2 className="text-lg sm:text-xl font-black text-foreground truncate mt-1">
                  Aula Virtual: {assignment.areaName}
                </h2>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <School className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>Estudio docente • Comparte diapositivas, guías, tareas y foros de debate</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
              <Button
                onClick={() => handleOpenPublish('LESSON_MATERIAL')}
                size="sm"
                className="gap-2 font-bold shadow-sm text-xs rounded-xl h-10 px-4 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Plus className="w-4 h-4" />
                <span>Nueva Publicación</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-10 w-10 rounded-full hover:bg-muted"
                title="Cerrar Aula Virtual"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* 2. Barra de Control: Bimestres, Filtros y Métricas */}
          <div className="p-3 sm:p-4 border-b border-border bg-muted/10 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Selector de Bimestres */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {[1, 2, 3, 4].map((bim) => (
                  <button
                    key={bim}
                    onClick={() => {
                      setSelectedBimester(bim);
                      setSearchQuery('');
                      setFilterType('ALL');
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 border ${
                      selectedBimester === bim
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : 'bg-card text-muted-foreground border-border hover:bg-muted'
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

              {/* Indicadores en vivo del bimestre */}
              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                <span className="text-[11px] font-bold text-muted-foreground hidden lg:inline">Recursos del periodo:</span>
                <Badge variant="outline" className="text-[10px] font-semibold gap-1 bg-card">
                  <BookOpen className="w-3 h-3 text-primary" />
                  <span>{materialsCount} Clases</span>
                </Badge>
                <Badge variant="outline" className="text-[10px] font-semibold gap-1 bg-card text-amber-700 dark:text-amber-300">
                  <ClipboardList className="w-3 h-3 text-amber-600" />
                  <span>{homeworksCount} Tareas</span>
                </Badge>
                <Badge variant="outline" className="text-[10px] font-semibold gap-1 bg-card text-emerald-700 dark:text-emerald-300">
                  <MessageSquare className="w-3 h-3 text-emerald-600" />
                  <span>{forumsCount} Foros</span>
                </Badge>
              </div>
            </div>

            {/* Filtros por Tipo de Contenido & Buscador */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => setFilterType('ALL')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors shrink-0 ${
                    filterType === 'ALL'
                      ? 'bg-primary/10 text-primary border border-primary/30'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  Todos ({contents.length})
                </button>
                <button
                  onClick={() => setFilterType('LESSON_MATERIAL')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors shrink-0 flex items-center gap-1 ${
                    filterType === 'LESSON_MATERIAL'
                      ? 'bg-primary/10 text-primary border border-primary/30'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <BookOpen className="w-3 h-3" />
                  <span>Materiales ({materialsCount})</span>
                </button>
                <button
                  onClick={() => setFilterType('HOMEWORK')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors shrink-0 flex items-center gap-1 ${
                    filterType === 'HOMEWORK'
                      ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <ClipboardList className="w-3 h-3" />
                  <span>Tareas ({homeworksCount})</span>
                </button>
                <button
                  onClick={() => setFilterType('FORUM')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors shrink-0 flex items-center gap-1 ${
                    filterType === 'FORUM'
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <MessageSquare className="w-3 h-3" />
                  <span>Foros ({forumsCount})</span>
                </button>
              </div>

              {/* Buscador de Publicación */}
              <div className="relative max-w-xs w-full">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Buscar material o tarea..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-7 h-8 text-xs bg-background rounded-xl"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 3. Área de Publicaciones / Contenido */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-44 w-full rounded-2xl" />
                ))}
              </div>
            ) : contents.length === 0 ? (
              /* Estudio de Inicio Rápido para el Docente */
              <div className="py-8 sm:py-12 space-y-6 max-w-2xl mx-auto text-center">
                <div className="space-y-2">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-sm">
                    <FolderOpen className="w-7 h-7" />
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-foreground">
                    Aún no hay publicaciones en el {selectedBimester}° Bimestre
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                    Comienza a nutrir tu aula virtual. Los estudiantes podrán acceder a tus materiales en Google Drive (5 TB), entregar tareas y participar en foros.
                  </p>
                </div>

                {/* 3 Tarjetas de Inicio Rápido */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                  <Card
                    onClick={() => handleOpenPublish('LESSON_MATERIAL')}
                    className="p-4 bg-card border-border hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-1.5">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                        Subir Clase o PPT
                      </h4>
                      <p className="text-[11px] text-muted-foreground leading-normal">
                        Sube diapositivas, fichas PDF o guías Word directo a la nube.
                      </p>
                    </div>
                    <span className="text-[11px] font-bold text-primary flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      Publicar Clase <Plus className="w-3 h-3" />
                    </span>
                  </Card>

                  <Card
                    onClick={() => handleOpenPublish('HOMEWORK')}
                    className="p-4 bg-card border-border hover:border-amber-500/50 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-1.5">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <ClipboardList className="w-5 h-5" />
                      </div>
                      <h4 className="text-xs font-bold text-foreground group-hover:text-amber-600 transition-colors">
                        Asignar Tarea
                      </h4>
                      <p className="text-[11px] text-muted-foreground leading-normal">
                        Fija fecha de entrega, pautas y adjunta la ficha de trabajo.
                      </p>
                    </div>
                    <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      Crear Tarea <Plus className="w-3 h-3" />
                    </span>
                  </Card>

                  <Card
                    onClick={() => handleOpenPublish('FORUM')}
                    className="p-4 bg-card border-border hover:border-emerald-500/50 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-1.5">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <MessageSquare className="w-5 h-5" />
                      </div>
                      <h4 className="text-xs font-bold text-foreground group-hover:text-emerald-600 transition-colors">
                        Iniciar Foro
                      </h4>
                      <p className="text-[11px] text-muted-foreground leading-normal">
                        Plantea una pregunta disparadora para debatir con tus alumnos.
                      </p>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      Crear Foro <Plus className="w-3 h-3" />
                    </span>
                  </Card>
                </div>
              </div>
            ) : filteredContents.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground space-y-3">
                <Filter className="w-10 h-10 mx-auto opacity-30" />
                <h4 className="text-sm font-bold text-foreground">No hay publicaciones con estos filtros</h4>
                <p className="text-xs max-w-sm mx-auto">
                  Prueba seleccionando otro tipo de contenido o limpiando la barra de búsqueda.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFilterType('ALL');
                    setSearchQuery('');
                  }}
                  className="text-xs font-bold rounded-xl"
                >
                  Restablecer Filtros
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredContents.map((item) => (
                  <CourseContentCard
                    key={item.id}
                    content={item}
                    canManage={true}
                    onDelete={handleDelete}
                    onOpenForum={(c) => setActiveForumContent(c)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Publicador */}
      <PublishContentModal
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        courseAssignmentId={assignment.id}
        defaultBimester={selectedBimester}
        defaultContentType={initialContentType}
        courseTitle={`${assignment.areaName} (${assignment.grade}° "${assignment.section}")`}
      />

      {/* Modal Foro Interactivo */}
      <ForumCommentsModal
        isOpen={!!activeForumContent}
        onClose={() => setActiveForumContent(null)}
        content={activeForumContent}
      />
    </>
  );
};
