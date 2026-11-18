import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { usersKeys } from './keys';
import type { DirectoryUser } from '../types';
import type { RelationshipType } from '../family-relationships/types';

/** Apoderado con los hijos que tiene vinculados en el colegio */
export interface FamilyMember extends DirectoryUser {
  familyRelations: Array<{
    id: string;
    relationshipType: RelationshipType;
    isLegalGuardian: boolean;
    isFinancialResponsible: boolean;
    student: { id: string; firstNames: string; lastNamePaternal: string; lastNameMaternal?: string | null };
  }>;
}

export interface FamiliesParams {
  search?: string;
  page?: number;
  limit?: number;
  /** Solo apoderados que aún no tienen ningún hijo vinculado */
  unlinked?: boolean;
}

interface FamiliesResponse {
  data: FamilyMember[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

/**
 * Apoderados del colegio, paginados y buscados en el servidor (nombre, apellidos, DNI o correo).
 * La clave empieza por 'users': se refresca sola al crear, editar o desactivar cuentas.
 */
export const useFamilies = ({ search = '', page = 1, limit = 20, unlinked = false }: FamiliesParams, enabled = true) =>
  useQuery({
    queryKey: usersKeys.families({ search, page, limit, unlinked }),
    queryFn: async () => {
      const params = new URLSearchParams({ role: 'PARENT', page: String(page), limit: String(limit) });
      if (search) params.set('search', search);
      if (unlinked) params.set('unlinked', 'true');
      return (await api.get<FamiliesResponse>(`/users?${params.toString()}`)).data;
    },
    enabled,
    placeholderData: keepPreviousData,
  });
