import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export interface PeriodDateConfig {
  periodNumber: number;
  name: string;
  startDate: string;
  endDate: string;
}

export interface AcademicYear {
  id: string;
  schoolId: string;
  year: number;
  name?: string | null;
  startDate: string;
  endDate: string;
  isActive: boolean;
  /** Año abierto para matricular (el siguiente) sin dejar de operar el vigente */
  enrollmentOpen?: boolean;
  periodType?: 'BIMESTER' | 'TRIMESTER';
  periodsConfig?: PeriodDateConfig[] | null;
  annualCalculationMode?: 'LAST_PERIOD' | 'AVERAGE';
}

export interface CreateAcademicYearPayload {
  year: number;
  name?: string;
  startDate: string;
  endDate: string;
  isActive?: boolean;
  periodType?: 'BIMESTER' | 'TRIMESTER';
  periodsConfig?: PeriodDateConfig[] | null;
  annualCalculationMode?: 'LAST_PERIOD' | 'AVERAGE';
}

interface ApiResponse<T> {
  status: string;
  data: T;
}

export const useAcademicYears = (enabled = true) => {
  return useQuery({
    enabled,
    queryKey: ['academic-years'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<AcademicYear[]>>('/academic-years');
      return response.data.data;
    },
  });
};

export const useActiveAcademicYear = () => {
  const query = useAcademicYears();
  const activeYear = (query.data || []).find((y) => y.isActive);
  return { ...query, activeYear };
};

/**
 * Periodos del año lectivo activo: 3 trimestres o 4 bimestres.
 * Fuente única para selectores de periodo en toda la app.
 */
export const usePeriods = () => {
  const { activeYear, isLoading } = useActiveAcademicYear();
  const isTrimester = activeYear?.periodType === 'TRIMESTER';
  const count = isTrimester ? 3 : 4;
  return {
    isLoading,
    isTrimester,
    count,
    periods: Array.from({ length: count }, (_, i) => i + 1),
    label: isTrimester ? 'Trimestre' : 'Bimestre',
    labelPlural: isTrimester ? 'Trimestres' : 'Bimestres',
  };
};

export const useCreateAcademicYear = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateAcademicYearPayload) => {
      const response = await api.post<ApiResponse<AcademicYear>>('/academic-years', payload);
      return response.data.data;
    },
    // Crear el primer año lo activa: todo lo demás depende del año activo
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
};

export const useUpdateAcademicYear = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<CreateAcademicYearPayload> }) => {
      const response = await api.patch<ApiResponse<AcademicYear>>(`/academic-years/${id}`, payload);
      return response.data.data;
    },
    // Cambiar de año activo afecta a todas las pantallas: se descarta toda la caché
    onSuccess: (_data, variables) => {
      if (variables.payload.isActive !== undefined) queryClient.invalidateQueries();
      else queryClient.invalidateQueries({ queryKey: ['academic-years'] });
    },
  });
};

export const useDeleteAcademicYear = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/academic-years/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-years'] });
    },
  });
};

export interface ActivationImpact {
  targetYear: number;
  currentYear: number | null;
  willDeactivate: number;
  willActivate: number;
  pendingObligationsOfCurrentYear: number;
  isEarly: boolean;
}

/** Qué pasa al activar un año (matrículas que dejan de estar vigentes) */
export const useActivationImpact = (academicYearId: string | null) =>
  useQuery({
    queryKey: ['academic-years', 'activation-impact', academicYearId],
    queryFn: async () =>
      (await api.get<ApiResponse<ActivationImpact>>(`/academic-years/${academicYearId}/activation-impact`)).data.data,
    enabled: !!academicYearId,
    staleTime: 0,
  });

export const useSetEnrollmentOpen = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, open }: { id: string; open: boolean }) =>
      (await api.patch<ApiResponse<AcademicYear>>(`/academic-years/${id}/enrollment-open`, { open })).data.data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['academic-years'] }),
  });
};

/** Año destino para matricular: el que tiene la matrícula abierta; si no, el siguiente al vigente. */
export const pickEnrollmentTargetYear = (years: AcademicYear[]): AcademicYear | null => {
  const open = years.find((y) => y.enrollmentOpen);
  if (open) return open;
  const active = years.find((y) => y.isActive);
  if (!active) return null;
  return [...years].filter((y) => y.year > active.year).sort((a, b) => a.year - b.year)[0] ?? null;
};
