import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import type {
  CourseContent,
  CreateCourseContentPayload,
  ForumComment,
  CreateCommentPayload,
  UploadFileResponse,
} from '../types';

/**
 * Obtener los contenidos de una asignación de curso (con filtro opcional de bimestre 1-4)
 */
export const useGetCourseContents = (courseAssignmentId?: string | null, bimester?: number | null) => {
  return useQuery({
    queryKey: ['course-contents', courseAssignmentId, bimester],
    queryFn: async (): Promise<CourseContent[]> => {
      if (!courseAssignmentId) return [];
      const params = new URLSearchParams();
      if (bimester) params.append('bimester', String(bimester));

      const res = await api.get<{
        status: string;
        data: { contents?: CourseContent[] } | CourseContent[];
      }>(`/course-contents/assignment/${courseAssignmentId}?${params.toString()}`);

      const payload = res.data.data;
      if (Array.isArray(payload)) return payload;
      if (payload && typeof payload === 'object' && Array.isArray(payload.contents)) {
        return payload.contents;
      }
      return [];
    },
    enabled: !!courseAssignmentId,
  });
};

/**
 * Subir archivo adjunto (PPT, Word, PDF, etc.)
 */
export const useUploadMaterial = () => {
  return useMutation({
    mutationFn: async (file: File): Promise<UploadFileResponse> => {
      const formData = new FormData();
      formData.append('file', file);

      const res = await api.post<{ status: string; data: UploadFileResponse }>(
        '/uploads/materials',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      );
      return res.data.data;
    },
  });
};

/**
 * Crear nuevo contenido (Material de clase, Tarea escolar o Foro)
 */
export const useCreateCourseContent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateCourseContentPayload): Promise<CourseContent> => {
      const res = await api.post<{ status: string; data: CourseContent }>(
        '/course-contents',
        payload,
      );
      return res.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['course-contents', variables.courseAssignmentId],
      });
    },
  });
};

/**
 * Eliminar contenido publicado
 */
export const useDeleteCourseContent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, courseAssignmentId }: { id: string; courseAssignmentId: string }) => {
      await api.delete(`/course-contents/${id}`);
      return { id, courseAssignmentId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: ['course-contents', result.courseAssignmentId],
      });
    },
  });
};

/**
 * Obtener comentarios / respuestas de un foro de debate
 */
export const useGetForumComments = (contentId?: string | null) => {
  return useQuery({
    queryKey: ['forum-comments', contentId],
    queryFn: async () => {
      if (!contentId) return [];
      const res = await api.get<{ status: string; data: ForumComment[] }>(
        `/course-contents/${contentId}/comments`,
      );
      return res.data.data;
    },
    enabled: !!contentId,
  });
};

/**
 * Publicar respuesta o comentario en un foro de debate
 */
export const useAddForumComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      contentId,
      payload,
    }: {
      contentId: string;
      payload: CreateCommentPayload;
    }): Promise<ForumComment> => {
      const res = await api.post<{ status: string; data: ForumComment }>(
        `/course-contents/${contentId}/comments`,
        payload,
      );
      return res.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['forum-comments', variables.contentId],
      });
      queryClient.invalidateQueries({
        queryKey: ['course-contents'],
      });
    },
  });
};

/**
 * Obtener las asignaturas y materias del aula del estudiante
 */
export const useGetStudentCourses = (studentId?: string | null) => {
  return useQuery({
    queryKey: ['student-courses', studentId],
    queryFn: async () => {
      if (!studentId) return null;
      const res = await api.get<{ status: string; data: import('../types').StudentCoursesResponse }>(
        `/course-contents/student/${studentId}/courses`,
      );
      return res.data.data;
    },
    enabled: !!studentId,
  });
};
