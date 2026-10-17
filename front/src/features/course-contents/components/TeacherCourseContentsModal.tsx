import React, { useState } from 'react';
import {
  X,
  Plus,
  BookOpen,
  School,
  FolderOpen,
} from 'lucide-react';
import { toast } from 'sonner';
import { useGetCourseContents, useDeleteCourseContent } from '../api/useCourseContents';
import type { CourseContent } from '../types';
import { CourseContentCard } from './CourseContentCard';
import { PublishContentModal } from './PublishContentModal';
import { ForumCommentsModal } from './ForumCommentsModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

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
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [activeForumContent, setActiveForumContent] = useState<CourseContent | null>(null);

  const { data: rawContents, isLoading } = useGetCourseContents(
    assignment?.id,
    selectedBimester,
  );
  const contents = Array.isArray(rawContents) ? rawContents : [];
  const { mutateAsync: deleteContent } = useDeleteCourseContent();

  if (!isOpen || !assignment) return null;

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Seguro que deseas eliminar esta publicación?')) return;
    try {
      await deleteContent({ id, courseAssignmentId: assignment.id });
      toast.success('Publicación eliminada correctamente');
    } catch {
      toast.error('Error al eliminar la publicación');
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="w-full max-w-4xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[90vh]">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-muted/20">
            <div>
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                <h2 className="text-base sm:text-lg font-bold text-foreground">
                  Aula Virtual: {assignment.areaName}
                </h2>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <School className="w-3.5 h-3.5 text-primary" />
                <span>
                  {assignment.grade}° "{assignment.section}" • {assignment.educationLevel}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => setIsPublishModalOpen(true)}
                size="sm"
                className="gap-1.5 font-bold shadow-sm text-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Publicar</span>
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Bimester Selector Tabs */}
          <div className="p-3 border-b border-border bg-card flex gap-2 overflow-x-auto">
            {[1, 2, 3, 4].map((bim) => (
              <button
                key={bim}
                onClick={() => setSelectedBimester(bim)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 border ${
                  selectedBimester === bim
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-background text-muted-foreground border-border hover:bg-muted'
                }`}
              >
                <span>{bim}° Bimestre</span>
                {selectedBimester === bim && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-primary-foreground/20 text-primary-foreground">
                    {contents.length}
                  </Badge>
                )}
              </button>
            ))}
          </div>

          {/* Content List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-44 w-full rounded-xl" />
                ))}
              </div>
            ) : contents.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <FolderOpen className="w-12 h-12 mx-auto opacity-30 mb-3" />
                <h3 className="text-sm font-bold text-foreground">
                  Aún no hay publicaciones en el {selectedBimester}° Bimestre
                </h3>
                <p className="text-xs max-w-sm mx-auto mt-1 leading-relaxed">
                  Comparte diapositivas de clase (PPT), lecturas PDF, tareas para casa o inicia un debate en el foro.
                </p>
                <Button
                  onClick={() => setIsPublishModalOpen(true)}
                  variant="outline"
                  size="sm"
                  className="mt-4 gap-1.5 text-xs font-bold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Publicar Primer Contenido</span>
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {contents.map((item) => (
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
        courseTitle={`${assignment.areaName} (${assignment.grade}° "${assignment.section}")`}
      />

      {/* Modal Foro */}
      <ForumCommentsModal
        isOpen={!!activeForumContent}
        onClose={() => setActiveForumContent(null)}
        content={activeForumContent}
      />
    </>
  );
};
