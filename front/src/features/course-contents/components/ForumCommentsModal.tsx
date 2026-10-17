import React, { useState } from 'react';
import { X, Send, MessageSquare, Loader2, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useGetForumComments, useAddForumComment } from '../api/useCourseContents';
import type { CourseContent } from '../types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface ForumCommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: CourseContent | null;
}

export const ForumCommentsModal: React.FC<ForumCommentsModalProps> = ({
  isOpen,
  onClose,
  content,
}) => {
  const [newComment, setNewComment] = useState('');
  const { data: comments = [], isLoading } = useGetForumComments(content?.id);
  const { mutateAsync: addComment, isPending: isSending } = useAddForumComment();

  if (!isOpen || !content) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newComment.trim();
    if (!trimmed) return;

    try {
      await addComment({
        contentId: content.id,
        payload: { content: trimmed },
      });
      setNewComment('');
      toast.success('Respuesta publicada en el foro');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al enviar respuesta';
      toast.error(msg);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground line-clamp-1">{content.title}</h2>
              <p className="text-[11px] text-muted-foreground">{content.bimester}° Bimestre • Foro de Debate</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Question Topic Card */}
        <div className="p-4 bg-muted/10 border-b border-border">
          <p className="text-xs font-medium text-foreground whitespace-pre-wrap leading-relaxed">
            {content.description || 'Sin descripción adicional para este foro.'}
          </p>
        </div>

        {/* Comments Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : comments.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <MessageSquare className="w-10 h-10 mx-auto opacity-30 mb-2" />
              <p className="text-xs font-semibold">Aún no hay respuestas en este foro</p>
              <p className="text-[11px]">Sé el primero en iniciar el debate respondiendo abajo.</p>
            </div>
          ) : (
            comments.map((comment) => {
              const isTeacherOrAdmin =
                comment.user.role === 'TEACHER' ||
                comment.user.role === 'SCHOOL_ADMIN' ||
                comment.user.role === 'SUPER_ADMIN';

              return (
                <div
                  key={comment.id}
                  className={`p-3 rounded-xl border text-xs space-y-1.5 transition-colors ${
                    isTeacherOrAdmin
                      ? 'bg-primary/5 border-primary/20'
                      : 'bg-background border-border'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-semibold text-foreground">
                      <UserIcon className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>
                        {comment.user.firstName} {comment.user.lastNamePaternal}
                      </span>
                      <Badge
                        variant={isTeacherOrAdmin ? 'default' : 'outline'}
                        className="text-[9px] px-1.5 py-0 h-4"
                      >
                        {comment.user.role === 'TEACHER' ? 'Docente' : comment.user.role === 'PARENT' ? 'Familia / Alumno' : comment.user.role}
                      </Badge>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(comment.createdAt).toLocaleDateString('es-PE', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-foreground whitespace-pre-wrap leading-relaxed pl-5">
                    {comment.content}
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="p-3 border-t border-border bg-card flex gap-2 items-end">
          <Textarea
            value={newComment}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewComment(e.target.value)}
            placeholder="Escribe tu opinión o respuesta al debate..."
            rows={2}
            className="text-xs resize-none flex-1 bg-background"
          />
          <Button
            type="submit"
            disabled={isSending || !newComment.trim()}
            size="sm"
            className="h-10 px-4 gap-1.5 font-bold"
          >
            {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Responder</span>
          </Button>
        </form>
      </div>
    </div>
  );
};
