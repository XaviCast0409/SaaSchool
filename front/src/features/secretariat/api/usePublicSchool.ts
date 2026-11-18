import { useQuery } from '@tanstack/react-query';
import { secretariatKeys } from './keys';
import type { Level } from './secretariatShared';

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
  const res = await fetch(`${PUBLIC_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.message ?? 'No se pudo completar la solicitud. Intente nuevamente.');
  return body.data as T;
}

export const usePublicSchool = (schoolId: string | undefined) =>
  useQuery({
    queryKey: secretariatKeys.publicSchool(schoolId),
    enabled: Boolean(schoolId),
    retry: false,
    queryFn: () => publicFetch<PublicSchool>(`/${schoolId}`),
  });

export const submitAdmission = (schoolId: string, payload: Record<string, unknown>) =>
  publicFetch<{ received: boolean }>(`/${schoolId}/admissions`, { method: 'POST', body: JSON.stringify(payload) });

export const submitComplaint = (schoolId: string, payload: Record<string, unknown>) =>
  publicFetch<{ code: string; dueDate: string }>(`/${schoolId}/complaints`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

