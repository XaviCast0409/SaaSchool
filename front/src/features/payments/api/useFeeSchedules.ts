import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { paymentsKeys, feeSchedules } from './keys';

/** Tarifario por año académico y vista previa del cronograma de cuotas al matricular. */

export type EducationLevel = 'INITIAL' | 'PRIMARY' | 'SECONDARY';

export const LEVEL_LABEL: Record<EducationLevel, string> = {
  INITIAL: 'Inicial',
  PRIMARY: 'Primaria',
  SECONDARY: 'Secundaria',
};

export const MONTH_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
export const MONTH_LONG = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

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

export const useFeeSchedules = (academicYearId: string | undefined) =>
  useQuery({
    queryKey: feeSchedules.byYear(academicYearId),
    queryFn: async () =>
      (await api.get<{ data: FeeSchedule[] }>('/payments/fee-schedules', { params: { academicYearId } })).data.data,
    enabled: !!academicYearId,
  });

export const useSaveFeeSchedule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      body,
      applyToPending,
    }: {
      id?: string;
      body: FeeScheduleBody;
      applyToPending?: boolean;
    }) =>
      id
        ? (
            await api.put<{ data: FeeSchedule & { repriced: number } }>(`/payments/fee-schedules/${id}`, {
              ...body,
              applyToPending: !!applyToPending,
            })
          ).data.data
        : (await api.post<{ data: FeeSchedule & { repriced?: number } }>('/payments/fee-schedules', body)).data.data,
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: feeSchedules.all });
      qc.invalidateQueries({ queryKey: paymentsKeys.schedulePreview.all });
      if (r.repriced)
        for (const key of [paymentsKeys.obligations.all[0], paymentsKeys.summary.all[0], paymentsKeys.statement.all[0]])
          qc.invalidateQueries({ queryKey: [key] });
    },
  });
};

export const useDeleteFeeSchedule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/payments/fee-schedules/${id}`)).data.data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: feeSchedules.all });
      qc.invalidateQueries({ queryKey: paymentsKeys.schedulePreview.all });
    },
  });
};

export const useCopyFeeSchedules = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { fromAcademicYearId: string; toAcademicYearId: string }) =>
      (await api.post<{ data: { copied: number; skipped: number } }>('/payments/fee-schedules/copy', body)).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: feeSchedules.all }),
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
        for (const key of [paymentsKeys.obligations.all[0], paymentsKeys.summary.all[0], paymentsKeys.statement.all[0]])
          qc.invalidateQueries({ queryKey: [key] });
      }
    },
  });
};

export const useSchedulePreview = (input: { academicYearId?: string; classroomId?: string; condition?: string }) =>
  useQuery({
    queryKey: paymentsKeys.schedulePreview.detail(input),
    queryFn: async () =>
      (await api.get<{ data: SchedulePreview }>('/enrollments/schedule-preview', { params: input })).data.data,
    enabled: !!input.academicYearId && !!input.classroomId,
    staleTime: 30_000,
  });

/** Número de pensiones y total anual estimado (sin cuota de ingreso). */
export const feeSummary = (f: Pick<FeeSchedule, 'enrollmentFee' | 'monthlyFee' | 'firstMonth' | 'lastMonth'>) => {
  const months = Math.max(0, f.lastMonth - f.firstMonth + 1);
  const rawAnnual = Number(f.enrollmentFee) + Number(f.monthlyFee) * months;
  const annual = Math.max(0, Math.round(rawAnnual * 100) / 100);
  return { months, annual };
};
