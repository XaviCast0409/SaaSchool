import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';

/** Re-matrícula: pasar alumnos de un año al siguiente sin volver a llenar la ficha. */

export type RolloverFlag =
  | 'ALREADY_ENROLLED'
  | 'GRADUATES'
  | 'DECLINED'
  | 'CONFIRMED'
  | 'NO_RATIFICATION'
  | 'NO_FINAL_SITUATION'
  | 'RECOVERY'
  | 'REPEATS'
  | 'DEBT'
  | 'NO_TARGET_CLASSROOM';

export type EnrollmentCondition = 'INGRESANTE' | 'CONTINUO' | 'TRASLADO' | 'REENTRANTE';

export interface RolloverClassroom {
  id: string;
  educationLevel: 'INITIAL' | 'PRIMARY' | 'SECONDARY';
  grade: number;
  section: string;
  shift: string;
  capacity: number;
  enrolledInTarget: number;
}

export interface RolloverRow {
  fromEnrollmentId: string;
  student: { id: string; firstNames: string; lastNamePaternal: string; lastNameMaternal: string | null; documentId: string };
  fromClassroom: { id: string; educationLevel: string; grade: number; section: string; shift: string };
  finalSituation: string | null;
  step: { kind: 'PROMOTE' | 'REPEAT'; level: string; grade: number } | { kind: 'GRADUATE' };
  proposedClassroomId: string | null;
  repeatingGrade: boolean;
  ratification: 'CONFIRMED' | 'DECLINED' | null;
  overdueDebt: number;
  enrolledInTarget: { educationLevel: string; grade: number; section: string } | null;
  flags: RolloverFlag[];
  selectable: boolean;
  selectedByDefault: boolean;
}

export interface RolloverCandidates {
  fromYear: { id: string; year: number };
  toYear: { id: string; year: number };
  classrooms: RolloverClassroom[];
  rows: RolloverRow[];
}

export interface RolloverItem {
  studentId: string;
  classroomId: string;
  condition: EnrollmentCondition;
  repeatingGrade: boolean;
}

export interface RolloverResult {
  year: number;
  enrolled: number;
  failed: number;
  cuotas: number;
  withoutFeeSchedule: number;
  results: Array<{ studentId: string; name: string; ok: boolean; enrollmentId?: string; cuotas?: number; total?: number; warning?: string | null; error?: string }>;
}

export const useRolloverCandidates = (params: { fromAcademicYearId?: string; toAcademicYearId?: string; classroomId?: string }, enabled = true) =>
  useQuery({
    queryKey: ['rollover-candidates', params],
    queryFn: async () => (await api.get<{ data: RolloverCandidates }>('/enrollments/rollover/candidates', { params })).data.data,
    enabled: enabled && !!params.fromAcademicYearId && !!params.toAcademicYearId && params.fromAcademicYearId !== params.toAcademicYearId,
  });

export const useRollover = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { toAcademicYearId: string; items: RolloverItem[] }) =>
      (await api.post<{ data: RolloverResult }>('/enrollments/rollover', body)).data.data,
    onSuccess: () => {
      for (const key of ['rollover-candidates', 'students', 'enrollments', 'classrooms', 'payments-obligations', 'financial-summary']) {
        qc.invalidateQueries({ queryKey: [key] });
      }
    },
  });
};

export const LEVEL_SHORT: Record<string, string> = { INITIAL: 'Inicial', PRIMARY: 'Primaria', SECONDARY: 'Secundaria' };

export const classroomLabel = (c: { educationLevel: string; grade: number; section: string }) =>
  c.educationLevel === 'INITIAL' ? `${c.grade} años "${c.section}" · Inicial` : `${c.grade}° "${c.section}" · ${LEVEL_SHORT[c.educationLevel] ?? c.educationLevel}`;
