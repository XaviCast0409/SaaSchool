import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { toast } from 'sonner';
import type {
  EvaluationCriterion,
  GradeMatrixResponse,
  BatchSaveGradesPayload,
  ReportCardData,
  SiagieSummaryData,
  CompetenceConclusionsResponse,
  BatchSaveConclusionsPayload,
  PeriodLockStatus,
  TogglePeriodLockPayload,
} from '../types';

interface ApiResponse<T> {
  status: string;
  data: T;
  message?: string;
}

import { useAuthStore } from '@/store/useAuthStore';

/**
 * Consulta la matriz completa de calificaciones para un curso y periodo.
 */
export const useGradeMatrix = (courseAssignmentId: string, periodNumber: number) => {
  const { user, impersonatedSchool } = useAuthStore();
  const currentSchoolId =
    user?.role === 'SUPER_ADMIN' && impersonatedSchool?.id
      ? impersonatedSchool.id
      : user?.schoolId;

  return useQuery({
    queryKey: ['grades-matrix', courseAssignmentId, periodNumber, currentSchoolId],
    queryFn: async () => {
      const response = await api.get<ApiResponse<GradeMatrixResponse>>('/grades/matrix', {
        params: { courseAssignmentId, periodNumber },
      });
      return response.data.data;
    },
    enabled: Boolean(courseAssignmentId && periodNumber > 0),
  });
};

/**
 * Guarda en bloque las calificaciones de la matriz.
 */
export const useSaveGradeMatrix = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: BatchSaveGradesPayload) => {
      const response = await api.post<ApiResponse<{ savedCount: number; message: string }>>(
        '/grades/matrix/batch',
        payload,
      );
      return response.data.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['grades-matrix', variables.courseAssignmentId, variables.periodNumber],
      });
      queryClient.invalidateQueries({
        queryKey: ['competence-conclusions', variables.courseAssignmentId, variables.periodNumber],
      });
      queryClient.invalidateQueries({
        queryKey: ['report-card'],
      });
      queryClient.invalidateQueries({
        queryKey: ['consolidated-grades'],
      });
      queryClient.invalidateQueries({
        queryKey: ['siagie-status'],
      });
      toast.success('Calificaciones guardadas', {
        description: data.message || `Se guardaron ${data.savedCount} notas con éxito.`,
      });
    },
    onError: (error: any) => {
      toast.error('Error al guardar calificaciones', {
        description:
          error?.response?.data?.message || 'Ocurrió un error inesperado al procesar las notas.',
      });
    },
  });
};

/**
 * Lista los criterios o rubros evaluativos del colegio.
 */
export const useEvaluationCriteria = (level?: string) => {
  return useQuery({
    queryKey: ['evaluation-criteria', level],
    queryFn: async () => {
      const response = await api.get<ApiResponse<EvaluationCriterion[]>>('/grades/criteria', {
        params: level ? { level } : undefined,
      });
      return response.data.data;
    },
  });
};

/**
 * Crea un nuevo criterio evaluativo (Admin).
 */
export const useCreateCriterion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<EvaluationCriterion>) => {
      const response = await api.post<ApiResponse<EvaluationCriterion>>('/grades/criteria', data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluation-criteria'] });
      toast.success('Criterio creado', {
        description: 'El nuevo rubro evaluativo ha sido registrado correctamente.',
      });
    },
    onError: (error: any) => {
      toast.error('Error al crear criterio', {
        description: error?.response?.data?.message || 'No se pudo registrar el criterio.',
      });
    },
  });
};

/**
 * Actualiza un criterio evaluativo (Admin).
 */
export const useUpdateCriterion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<EvaluationCriterion> }) => {
      const response = await api.put<ApiResponse<EvaluationCriterion>>(`/grades/criteria/${id}`, data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluation-criteria'] });
      toast.success('Criterio actualizado', {
        description: 'Las modificaciones han sido guardadas.',
      });
    },
    onError: (error: any) => {
      toast.error('Error al actualizar criterio', {
        description: error?.response?.data?.message || 'No se pudo actualizar el criterio.',
      });
    },
  });
};

/**
 * Desactiva un criterio evaluativo (Admin).
 */
export const useDeleteCriterion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete<ApiResponse<null>>(`/grades/criteria/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluation-criteria'] });
      toast.success('Criterio desactivado', {
        description: 'El criterio ya no aparecerá en nuevas evaluaciones.',
      });
    },
    onError: (error: any) => {
      toast.error('Error al desactivar criterio', {
        description: error?.response?.data?.message || 'No se pudo desactivar el criterio.',
      });
    },
  });
};

/**
 * Consulta la libreta oficial completa para un estudiante.
 */
export const useReportCard = (enrollmentId: string) => {
  return useQuery({
    queryKey: ['report-card', enrollmentId],
    queryFn: async () => {
      const response = await api.get<ApiResponse<ReportCardData>>(
        `/grades/report-card/${enrollmentId}`,
      );
      return response.data.data;
    },
    enabled: Boolean(enrollmentId),
  });
};

/**
 * Consulta el estado de consolidación y avance para SIAGIE.
 */
export const useSiagieSummary = (
  classroomId: string,
  periodNumber: number,
  options?: { enabled?: boolean },
) => {
  const { user, impersonatedSchool } = useAuthStore();
  const currentSchoolId =
    user?.role === 'SUPER_ADMIN' && impersonatedSchool?.id
      ? impersonatedSchool.id
      : user?.schoolId;

  return useQuery({
    queryKey: ['siagie-summary', classroomId, periodNumber, currentSchoolId],
    queryFn: async () => {
      const response = await api.get<ApiResponse<SiagieSummaryData>>('/grades/siagie/summary', {
        params: { classroomId, periodNumber },
      });
      return response.data.data;
    },
    enabled: (options?.enabled ?? true) && Boolean(classroomId && periodNumber > 0),
  });
};

/**
 * Consulta la lista de alumnos con sus notas y conclusiones descriptivas para una competencia.
 */
export const useCompetenceConclusions = (
  courseAssignmentId: string,
  periodNumber: number,
  competenceId?: string,
) => {
  const { user, impersonatedSchool } = useAuthStore();
  const currentSchoolId =
    user?.role === 'SUPER_ADMIN' && impersonatedSchool?.id
      ? impersonatedSchool.id
      : user?.schoolId;

  return useQuery({
    queryKey: ['competence-conclusions', courseAssignmentId, periodNumber, competenceId, currentSchoolId],
    queryFn: async () => {
      const response = await api.get<ApiResponse<CompetenceConclusionsResponse>>(
        '/grades/conclusions',
        {
          params: {
            courseAssignmentId,
            periodNumber,
            ...(competenceId ? { competenceId } : {}),
          },
        },
      );
      return response.data.data;
    },
    enabled: Boolean(courseAssignmentId && periodNumber > 0),
    staleTime: 0,
    refetchOnMount: 'always',
  });
};

/**
 * Guarda en bloque las conclusiones descriptivas de una competencia.
 */
export const useSaveCompetenceConclusions = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: BatchSaveConclusionsPayload) => {
      const response = await api.post<ApiResponse<{ savedCount: number; message: string }>>(
        '/grades/conclusions/batch',
        payload,
      );
      return response.data.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [
          'competence-conclusions',
          variables.courseAssignmentId,
          variables.periodNumber,
          variables.competenceId,
        ],
      });
      // También invalidamos la libreta para que actualice las conclusiones en tiempo real
      queryClient.invalidateQueries({ queryKey: ['report-card'] });
      toast.success('Conclusiones guardadas', {
        description: data.message || `Se guardaron ${data.savedCount} comentarios con éxito.`,
      });
    },
    onError: (error: any) => {
      toast.error('Error al guardar conclusiones', {
        description:
          error?.response?.data?.message || 'No se pudieron guardar las conclusiones descriptivas.',
      });
    },
  });
};

/**
 * Consulta el estado de bloqueo de un periodo para un aula específica o global.
 */
export const usePeriodLock = (
  classroomId?: string,
  periodNumber?: number,
  options?: { enabled?: boolean },
) => {
  const { user, impersonatedSchool } = useAuthStore();
  const currentSchoolId =
    user?.role === 'SUPER_ADMIN' && impersonatedSchool?.id
      ? impersonatedSchool.id
      : user?.schoolId;

  return useQuery({
    queryKey: ['period-lock', classroomId, periodNumber, currentSchoolId],
    queryFn: async () => {
      const response = await api.get<ApiResponse<PeriodLockStatus>>('/grades/period-lock', {
        params: {
          ...(classroomId ? { classroomId } : {}),
          periodNumber,
        },
      });
      return response.data.data;
    },
    enabled: (options?.enabled ?? true) && Boolean(periodNumber && periodNumber > 0 && classroomId),
  });
};

/**
 * Bloquea o reabre un periodo de calificaciones (Dirección).
 */
export const useTogglePeriodLock = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: TogglePeriodLockPayload) => {
      const response = await api.post<ApiResponse<PeriodLockStatus>>(
        '/grades/period-lock/toggle',
        payload,
      );
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['period-lock'] });
      queryClient.invalidateQueries({ queryKey: ['grades-matrix'] });
      queryClient.invalidateQueries({ queryKey: ['competence-conclusions'] });
      queryClient.invalidateQueries({ queryKey: ['siagie-summary'] });
      toast.success(
        variables.isLocked ? 'Bimestre bloqueado' : 'Bimestre reabierto',
        {
          description: data.message,
        },
      );
    },
    onError: (error: any) => {
      toast.error('Error al cambiar estado del periodo', {
        description: error?.response?.data?.message || 'No se pudo actualizar el estado de bloqueo.',
      });
    },
  });
};

