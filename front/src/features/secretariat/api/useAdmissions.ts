import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { KEY, type AdmissionStatus, type Level } from './secretariatShared';
import { secretariatKeys } from './keys';

export interface SecretariatSettings {
  admissionsOpen: boolean;
  admissionsYear: number | null;
  admissionsMessage: string | null;
  ratificationOpen: boolean;
  ratificationYear: number | null;
  ratificationDeadline: string | null;
  blockCertificatesOnOverdue: boolean;
  pending: { admissions: number; documents: number; complaints: number };
}

export interface AdmissionApplication {
  id: string;
  status: AdmissionStatus;
  targetYear: number;
  educationLevel: Level;
  grade: number;
  gradeLabel: string;
  studentFirstNames: string;
  studentLastNamePaternal: string;
  studentLastNameMaternal: string | null;
  studentDocumentType: string;
  studentDocumentId: string;
  studentBirthDate: string;
  studentGender: 'MALE' | 'FEMALE';
  previousSchool: string | null;
  guardianFirstName: string;
  guardianLastNames: string;
  guardianDocumentId: string | null;
  guardianRelation: string;
  guardianPhone: string;
  guardianEmail: string | null;
  familyNotes: string | null;
  staffNotes: string | null;
  interviewAt: string | null;
  studentId: string | null;
  createdAt: string;
}

export interface RatificationRow {
  studentId: string;
  studentName: string;
  classroom: string;
  decision: 'CONFIRMED' | 'DECLINED' | null;
  comment: string | null;
  signedBy: string | null;
  signedAt: string | null;
}

export const useSecretariatSettings = (enabled = true) =>
  useQuery({
    queryKey: secretariatKeys.settings(),
    enabled,
    queryFn: async () => (await api.get<{ data: SecretariatSettings }>('/secretariat/settings')).data.data,
  });

export const useSaveSecretariatSettings = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<SecretariatSettings, 'pending' | 'blockCertificatesOnOverdue'>) =>
      (await api.put('/secretariat/settings', input)).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};

export const useAdmissions = (filters: { year?: number; q?: string }) =>
  useQuery({
    queryKey: secretariatKeys.admissions(filters),
    queryFn: async () =>
      (
        await api.get<{ data: { rows: AdmissionApplication[]; years: number[] } }>('/secretariat/admissions', {
          params: filters,
        })
      ).data.data,
  });

export const useUpdateAdmission = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: {
      id: string;
      status?: AdmissionStatus;
      staffNotes?: string | null;
      interviewAt?: string | null;
    }) => (await api.patch(`/secretariat/admissions/${id}`, input)).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};

export const useConvertAdmission = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (
        await api.post<{ data: { studentId: string; linkedExisting: boolean } }>(
          `/secretariat/admissions/${id}/convert`,
        )
      ).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};

export const useRatifications = () =>
  useQuery({
    queryKey: secretariatKeys.ratifications(),
    queryFn: async () =>
      (await api.get<{ data: { targetYear: number | null; rows: RatificationRow[] } }>('/secretariat/ratifications'))
        .data.data,
  });

export const useRemindRatification = () =>
  useMutation({
    mutationFn: async () =>
      (await api.post<{ data: { families: number; students: number } }>('/secretariat/ratifications/remind')).data.data,
  });

