import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export type Level = 'INITIAL' | 'PRIMARY' | 'SECONDARY';
export type AdmissionStatus = 'NEW' | 'INTERVIEW' | 'ADMITTED' | 'ENROLLED' | 'REJECTED' | 'WITHDRAWN';
export type DocumentStatus = 'REQUESTED' | 'IN_PROCESS' | 'READY' | 'DELIVERED' | 'REJECTED';
export type DocumentType =
  | 'CONSTANCIA_ESTUDIOS'
  | 'CONSTANCIA_MATRICULA'
  | 'CONSTANCIA_CONDUCTA'
  | 'CONSTANCIA_NO_ADEUDO'
  | 'CERTIFICADO_ESTUDIOS'
  | 'LIBRETA_NOTAS'
  | 'OTRO';

export const ADMISSION_LABEL: Record<AdmissionStatus, string> = {
  NEW: 'Nueva',
  INTERVIEW: 'Entrevista',
  ADMITTED: 'Admitido',
  ENROLLED: 'Registrado',
  REJECTED: 'No admitido',
  WITHDRAWN: 'Desistió',
};
export const DOCUMENT_STATUS_LABEL: Record<DocumentStatus, string> = {
  REQUESTED: 'Solicitado',
  IN_PROCESS: 'En proceso',
  READY: 'Listo',
  DELIVERED: 'Entregado',
  REJECTED: 'Observado',
};
export const DOCUMENT_TYPE_LABEL: Record<DocumentType, string> = {
  CONSTANCIA_ESTUDIOS: 'Constancia de estudios',
  CONSTANCIA_MATRICULA: 'Constancia de matrícula',
  CONSTANCIA_CONDUCTA: 'Constancia de conducta',
  CONSTANCIA_NO_ADEUDO: 'Constancia de no adeudo',
  CERTIFICADO_ESTUDIOS: 'Certificado de estudios',
  LIBRETA_NOTAS: 'Copia de libreta de notas',
  OTRO: 'Otro documento',
};
export const LEVEL_LABEL: Record<Level, string> = { INITIAL: 'Inicial', PRIMARY: 'Primaria', SECONDARY: 'Secundaria' };
export const gradeOptions = (level: Level): Array<{ value: number; label: string }> =>
  level === 'INITIAL'
    ? [3, 4, 5].map((g) => ({ value: g, label: `${g} años` }))
    : Array.from({ length: level === 'PRIMARY' ? 6 : 5 }, (_, i) => ({ value: i + 1, label: `${i + 1}.° grado` }));

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

export interface DocumentRequestRow {
  id: string;
  type: DocumentType;
  typeLabel: string;
  purpose: string | null;
  copies: number;
  status: DocumentStatus;
  debtHold: boolean;
  staffNote: string | null;
  fileUrl: string | null;
  createdAt: string;
  studentId: string;
  studentName?: string;
  requestedBy?: string;
  requestedByPhone?: string | null;
}

export interface Complaint {
  id: string;
  code: string;
  kind: 'RECLAMO' | 'QUEJA';
  status: 'OPEN' | 'ANSWERED';
  consumerName: string;
  consumerDocType: string;
  consumerDocId: string;
  consumerAddress: string | null;
  consumerPhone: string | null;
  consumerEmail: string;
  isMinor: boolean;
  guardianName: string | null;
  itemType: string;
  itemDescription: string;
  amount: string | null;
  detail: string;
  request: string;
  dueDate: string;
  response: string | null;
  respondedAt: string | null;
  respondedBy: string | null;
  createdAt: string;
  daysLeft: number | null;
}

const KEY = ['secretariat'];

export const useSecretariatSettings = (enabled = true) =>
  useQuery({ queryKey: [...KEY, 'settings'], enabled, queryFn: async () => (await api.get<{ data: SecretariatSettings }>('/secretariat/settings')).data.data });

export const useSaveSecretariatSettings = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<SecretariatSettings, 'pending' | 'blockCertificatesOnOverdue'>) => (await api.put('/secretariat/settings', input)).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};

export const useAdmissions = (filters: { year?: number; q?: string }) =>
  useQuery({
    queryKey: [...KEY, 'admissions', filters],
    queryFn: async () => (await api.get<{ data: { rows: AdmissionApplication[]; years: number[] } }>('/secretariat/admissions', { params: filters })).data.data,
  });

export const useUpdateAdmission = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string; status?: AdmissionStatus; staffNotes?: string | null; interviewAt?: string | null }) =>
      (await api.patch(`/secretariat/admissions/${id}`, input)).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};

export const useConvertAdmission = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.post<{ data: { studentId: string; linkedExisting: boolean } }>(`/secretariat/admissions/${id}/convert`)).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};

export const useRatifications = () =>
  useQuery({
    queryKey: [...KEY, 'ratifications'],
    queryFn: async () => (await api.get<{ data: { targetYear: number | null; rows: RatificationRow[] } }>('/secretariat/ratifications')).data.data,
  });

export const useRemindRatification = () =>
  useMutation({ mutationFn: async () => (await api.post<{ data: { families: number; students: number } }>('/secretariat/ratifications/remind')).data.data });

export const useDocumentRequests = (status?: DocumentStatus) =>
  useQuery({
    queryKey: [...KEY, 'documents', status],
    queryFn: async () => (await api.get<{ data: DocumentRequestRow[] }>('/secretariat/documents', { params: { status } })).data.data,
  });

export const useUpdateDocument = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string; status?: DocumentStatus; staffNote?: string | null; fileUrl?: string | null; releaseHold?: boolean }) =>
      (await api.patch(`/secretariat/documents/${id}`, input)).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};

export const useComplaints = (enabled = true) =>
  useQuery({ queryKey: [...KEY, 'complaints'], enabled, queryFn: async () => (await api.get<{ data: Complaint[] }>('/secretariat/complaints')).data.data });

export const useRespondComplaint = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, response }: { id: string; response: string }) => (await api.post(`/secretariat/complaints/${id}/respond`, { response })).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};

// ------------------------------------------------------------------ Familia

export interface FamilyProcedures {
  ratification: { open: boolean; year: number | null; deadline: string | null };
  children: Array<{ studentId: string; name: string; ratification: { decision: 'CONFIRMED' | 'DECLINED'; comment: string | null; updatedAt: string } | null }>;
  requests: DocumentRequestRow[];
}

export const useFamilyProcedures = () =>
  useQuery({ queryKey: [...KEY, 'family'], queryFn: async () => (await api.get<{ data: FamilyProcedures }>('/secretariat/family')).data.data });

export const useRatify = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { studentId: string; decision: 'CONFIRMED' | 'DECLINED'; comment?: string }) => (await api.post('/secretariat/family/ratify', input)).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: [...KEY, 'family'] }),
  });
};

export const useRequestDocument = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { studentId: string; type: DocumentType; purpose?: string; copies: number }) =>
      (await api.post<{ data: DocumentRequestRow }>('/secretariat/family/documents', input)).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: [...KEY, 'family'] }),
  });
};

// ------------------------------------------------------------------ Público (sin sesión)

export interface PublicSchool {
  id: string;
  name: string;
  documentId: string;
  address: string | null;
  district: string | null;
  province: string | null;
  department: string | null;
  phone: string | null;
  email: string | null;
  logoUrl: string | null;
  brandColor: string | null;
  offeredLevels: Level[];
  admissionsOpen: boolean;
  admissionsYear: number | null;
  admissionsMessage: string | null;
}

const PUBLIC_BASE = `${(import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')}/public/schools`;

/** Fetch sin token ni interceptores: estas páginas las abre gente sin cuenta. */
async function publicFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${PUBLIC_BASE}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.message ?? 'No se pudo completar la solicitud. Intente nuevamente.');
  return body.data as T;
}

export const usePublicSchool = (schoolId: string | undefined) =>
  useQuery({ queryKey: ['public-school', schoolId], enabled: Boolean(schoolId), retry: false, queryFn: () => publicFetch<PublicSchool>(`/${schoolId}`) });

export const submitAdmission = (schoolId: string, payload: Record<string, unknown>) =>
  publicFetch<{ received: boolean }>(`/${schoolId}/admissions`, { method: 'POST', body: JSON.stringify(payload) });

export const submitComplaint = (schoolId: string, payload: Record<string, unknown>) =>
  publicFetch<{ code: string; dueDate: string }>(`/${schoolId}/complaints`, { method: 'POST', body: JSON.stringify(payload) });
