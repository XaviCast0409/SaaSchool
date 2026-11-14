import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';

/** Tarifario por año académico y vista previa del cronograma de cuotas al matricular. */

export type EducationLevel = 'INITIAL' | 'PRIMARY' | 'SECONDARY';

export const LEVEL_LABEL: Record<EducationLevel, string> = {
  INITIAL: 'Inicial',
  PRIMARY: 'Primaria',
  SECONDARY: 'Secundaria',
};

export const MONTH_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
export const MONTH_LONG = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export interface FeeSchedule {
  id: string;
  academicYearId: string;
  educationLevel: EducationLevel;
  grade: number | null;
  enrollmentFee: number;
  admissionFee: number;
  monthlyFee: number;
  firstMonth: number;
  lastMonth: number;
  dueDay: number;
  updatedAt: string;
}

export type FeeScheduleBody = Omit<FeeSchedule, 'id' | 'updatedAt'>;

export interface PlannedObligation {
  concept: 'MATRICULA' | 'CUOTA_INGRESO' | 'PENSION';
  period: string;
  title: string;
  amountDue: number;
  dueDate: string;
}

export interface SchedulePreview {
  feeScheduleFound: boolean;
  items: PlannedObligation[];
  total: number;
  warning: string | null;
}

/** Resultado del cronograma que devuelve el backend al matricular. */
export interface ScheduleResult {
  feeScheduleFound: boolean;
  created: number;
  skipped: number;
  total: number;
  warning: string | null;
  scholarshipsApplied?: number;
}

const KEY = 'fee-schedules';

export const useFeeSchedules = (academicYearId: string | undefined) =>
  useQuery({
    queryKey: [KEY, academicYearId],
    queryFn: async () => (await api.get<{ data: FeeSchedule[] }>('/payments/fee-schedules', { params: { academicYearId } })).data.data,
    enabled: !!academicYearId,
  });

export const useSaveFeeSchedule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body, applyToPending }: { id?: string; body: FeeScheduleBody; applyToPending?: boolean }) =>
      id
        ? (await api.put<{ data: FeeSchedule & { repriced: number } }>(`/payments/fee-schedules/${id}`, { ...body, applyToPending: !!applyToPending })).data.data
        : (await api.post<{ data: FeeSchedule & { repriced?: number } }>('/payments/fee-schedules', body)).data.data,
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ['schedule-preview'] });
      if (r.repriced) for (const key of ['payments-obligations', 'financial-summary', 'statement']) qc.invalidateQueries({ queryKey: [key] });
    },
  });
};

export const useDeleteFeeSchedule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/payments/fee-schedules/${id}`)).data.data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ['schedule-preview'] });
    },
  });
};

export const useCopyFeeSchedules = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { fromAcademicYearId: string; toAcademicYearId: string }) =>
      (await api.post<{ data: { copied: number; skipped: number } }>('/payments/fee-schedules/copy', body)).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
};

export interface GenerateMissingResult {
  year: number;
  dryRun: boolean;
  enrollments: number;
  withMissing: number;
  withoutFeeSchedule: number;
  cuotas: number;
  total: number;
  scholarshipsApplied: number;
}

/** Completa las cuotas que les faltan a las matrículas de un año (dryRun = solo contar). */
export const useGenerateMissing = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { academicYearId: string; dryRun: boolean }) =>
      (await api.post<{ data: GenerateMissingResult }>('/payments/fee-schedules/generate-missing', body)).data.data,
    onSuccess: (r) => {
      if (!r.dryRun) {
        for (const key of ['payments-obligations', 'financial-summary', 'statement']) qc.invalidateQueries({ queryKey: [key] });
      }
    },
  });
};

export const useSchedulePreview = (input: { academicYearId?: string; classroomId?: string; condition?: string }) =>
  useQuery({
    queryKey: ['schedule-preview', input],
    queryFn: async () => (await api.get<{ data: SchedulePreview }>('/enrollments/schedule-preview', { params: input })).data.data,
    enabled: !!input.academicYearId && !!input.classroomId,
    staleTime: 30_000,
  });

/** Número de pensiones y total anual estimado (sin cuota de ingreso). */
export const feeSummary = (f: Pick<FeeSchedule, 'enrollmentFee' | 'monthlyFee' | 'firstMonth' | 'lastMonth'>) => {
  const months = Math.max(0, f.lastMonth - f.firstMonth + 1);
  return { months, annual: Math.round((Number(f.enrollmentFee) + Number(f.monthlyFee) * months) * 100) / 100 };
};
