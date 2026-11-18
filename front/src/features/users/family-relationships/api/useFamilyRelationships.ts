import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { studentsKeys } from '@/features/students/api/keys';
import { usersKeys } from '@/features/users/api/keys';
import { familyRelationshipsKeys } from './keys';
import type { FamilyRelationship } from '../types';
import type { LinkParentFormData } from '../schemas/link-parent.schema';

/** Listas que muestran vínculos: alumnos (cuántos apoderados) y familias (qué hijos) */
const invalidateFamilyLists = (queryClient: QueryClient) => {
  queryClient.invalidateQueries({ queryKey: familyRelationshipsKeys.all });
  queryClient.invalidateQueries({ queryKey: studentsKeys.all });
  queryClient.invalidateQueries({ queryKey: usersKeys.familiesAll });
};

interface FamilyResponse {
  status: string;
  data: FamilyRelationship[];
}

interface SingleFamilyResponse {
  status: string;
  data: FamilyRelationship;
}

/** Apoderados de un alumno específico */
export const useStudentParents = (studentId: string) => {
  return useQuery({
    queryKey: familyRelationshipsKeys.studentParents(studentId),
    queryFn: async () => {
      const response = await api.get<FamilyResponse>(`/students/${studentId}/parents`);
      return response.data.data;
    },
    enabled: !!studentId,
  });
};

/** Hijos/alumnos de un apoderado específico */
export const useParentStudents = (userId: string) => {
  return useQuery({
    queryKey: familyRelationshipsKeys.parentStudents(userId),
    queryFn: async () => {
      const response = await api.get<FamilyResponse>(`/users/${userId}/students`);
      return response.data.data;
    },
    enabled: !!userId,
  });
};

/** Listado completo de relaciones del colegio */
export const useFamilyRelationships = () => {
  return useQuery({
    queryKey: familyRelationshipsKeys.all,
    queryFn: async () => {
      const response = await api.get<FamilyResponse>('/family-relationships');
      return response.data.data;
    },
  });
};

/** Vincular padre ↔ alumno */
export const useLinkParent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: LinkParentFormData) => {
      const response = await api.post<SingleFamilyResponse>('/family-relationships', data);
      return response.data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: familyRelationshipsKeys.studentParents(variables.studentId) });
      queryClient.invalidateQueries({ queryKey: familyRelationshipsKeys.parentStudents(variables.userId) });
      invalidateFamilyLists(queryClient);
    },
  });
};

/** Eliminar vínculo padre ↔ alumno */
export const useDeleteRelationship = (studentId?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/family-relationships/${id}`);
    },
    onSuccess: () => {
      if (studentId) {
        queryClient.invalidateQueries({ queryKey: familyRelationshipsKeys.studentParents(studentId) });
      }
      queryClient.invalidateQueries({ queryKey: familyRelationshipsKeys.parentStudentsAll });
      invalidateFamilyLists(queryClient);
    },
  });
};

/** Cambiar parentesco o marcas (apoderado legal, responsable de pago, convive) sin desvincular */
export const useUpdateRelationship = (studentId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: { id: string } & Partial<
      Pick<FamilyRelationship, 'relationshipType' | 'isLegalGuardian' | 'isFinancialResponsible' | 'livesWithStudent'>
    >) => {
      const response = await api.patch<SingleFamilyResponse>(`/family-relationships/${id}`, patch);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: familyRelationshipsKeys.studentParents(studentId) });
      queryClient.invalidateQueries({ queryKey: familyRelationshipsKeys.parentStudentsAll });
      invalidateFamilyLists(queryClient);
    },
  });
};
