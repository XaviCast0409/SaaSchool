import { confirmDialog } from '@/components/ui/confirm';
import { formatEducationLevel } from '@/lib/utils';
import React, { useState, useMemo } from 'react';
import {
  X,
  Plus,
  School,
  Cloud,
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
import { usePeriods } from '@/features/academic/api';
import { TeacherContentsControlBar } from './teacher-course-contents-modal/TeacherContentsControlBar';
import { TeacherQuickStartCards } from './teacher-course-contents-modal/TeacherQuickStartCards';

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

  const { data: rawContents, isLoading } = useGetCourseContents(assignment?.id, selectedBimester);
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

  const { data: academicPeriods } = usePeriods();
  const isTrimester = academicPeriods?.periods.length === 3;
  const periods = isTrimester ? [1, 2, 3] : [1, 2, 3, 4];
  const periodLabel = isTrimester ? 'Trimestre' : 'Bimestre';

  const materialsCount = contents.filter((c) => c.contentType === 'LESSON_MATERIAL').length;
  const homeworksCount = contents.filter((c) => c.contentType === 'HOMEWORK').length;
  const forumsCount = contents.filter((c) => c.contentType === 'FORUM').length;

  if (!isOpen || !assignment) return null;

  const handleOpenPublish = (type: ContentType = 'LESSON_MATERIAL') => {
    setInitialContentType(type);
    setIsPublishModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (
      !(await confirmDialog({
        title: '¿Eliminar esta publicación del aula virtual?',
        confirmText: 'Eliminar',
        variant: 'danger',
      }))
    )
      return;
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
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-border bg-gradient-to-r from-card via-muted/20 to-card flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-sm border border-primary/20">
                <IconComponent className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={`text-xs font-bold py-0 h-4 ${theme.badgeStyle}`}>
                    {theme.category}
                  </Badge>
                  <Badge variant="secondary" className="text-xs font-bold py-0 h-4">
                    {assignment.grade}° "{assignment.section}" • {formatEducationLevel(assignment.educationLevel)}
                  </Badge>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <Cloud className="w-3 h-3" />
                    <span>Almacenamiento Cloud</span>
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

          <TeacherContentsControlBar
            periods={periods}
            periodLabel={periodLabel}
            selectedBimester={selectedBimester}
            contentsCount={contents.length}
            materialsCount={materialsCount}
            homeworksCount={homeworksCount}
            forumsCount={forumsCount}
            filterType={filterType}
            searchQuery={searchQuery}
            onSelectBimester={(bim) => {
              setSelectedBimester(bim);
              setSearchQuery('');
              setFilterType('ALL');
            }}
            onFilterTypeChange={setFilterType}
            onSearchChange={setSearchQuery}
          />

          {/* Área de Publicaciones */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-44 w-full rounded-2xl" />
                ))}
              </div>
            ) : contents.length === 0 ? (
              <TeacherQuickStartCards
                selectedBimester={selectedBimester}
                periodLabel={periodLabel}
                onOpenPublish={handleOpenPublish}
              />
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
