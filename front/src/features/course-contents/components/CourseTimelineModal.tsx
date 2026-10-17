import React, { useState } from 'react';
import { X, BookOpen, School, FolderOpen, User as UserIcon } from 'lucide-react';
import { useGetCourseContents } from '../api/useCourseContents';
import type { CourseContent } from '../types';
import { CourseContentCard } from './CourseContentCard';
import { ForumCommentsModal } from './ForumCommentsModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface CourseTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignmentId: string | null;
  areaName: string;
  teacherName?: string | null;
  classroomLabel: string;
}

export const CourseTimelineModal: React.FC<CourseTimelineModalProps> = ({
  isOpen,
  onClose,
  assignmentId,
  areaName,
  teacherName,
  classroomLabel,
}) => {
  const [selectedBimester, setSelectedBimester] = useState<number>(1);
  const [activeForumContent, setActiveForumContent] = useState<CourseContent | null>(null);

  const { data: rawContents, isLoading } = useGetCourseContents(
    assignmentId,
    selectedBimester,
  );
  const contents = Array.isArray(rawContents) ? rawContents : [];

  if (!isOpen || !assignmentId) return null;

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
                  {areaName}
                </h2>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                <div className="flex items-center gap-1 font-semibold text-foreground">
                  <School className="w-3.5 h-3.5 text-primary" />
                  <span>{classroomLabel}</span>
                </div>
                {teacherName && (
                  <div className="flex items-center gap-1">
                    <UserIcon className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Prof. {teacherName}</span>
                  </div>
                )}
              </div>
            </div>

            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Selector de Bimestres */}
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

          {/* Muro de Contenidos */}
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
                  Sin materiales publicados en el {selectedBimester}° Bimestre
                </h3>
                <p className="text-xs max-w-sm mx-auto mt-1 leading-relaxed">
                  Tu profesor aún no ha compartido diapositivas, tareas o foros para este bimestre. Vuelve a consultar pronto.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {contents.map((item) => (
                  <CourseContentCard
                    key={item.id}
                    content={item}
                    canManage={false}
                    onOpenForum={(c) => setActiveForumContent(c)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Foro Interactivo para debate */}
      <ForumCommentsModal
        isOpen={!!activeForumContent}
        onClose={() => setActiveForumContent(null)}
        content={activeForumContent}
      />
    </>
  );
};
