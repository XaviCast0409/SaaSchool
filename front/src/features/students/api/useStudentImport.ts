import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { studentsKeys } from './keys';
import { classroomsKeys } from '@/features/classrooms/api/keys';
import { enrollmentsKeys } from '@/features/enrollments/api/keys';
import { academicKeys } from '@/features/academic/api/keys';
import { usersKeys } from '@/features/users/api/keys';
import type { StudentImportPlan, StudentImportResult } from '../importTypes';

interface Envelope<T> {
  status: string;
  data: T;
}

const UPLOAD = { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 300_000 } as const;

const formOf = (file: File, extra: Record<string, boolean> = {}): FormData => {
  const form = new FormData();
  form.append('file', file, file.name);
  Object.entries(extra).forEach(([key, value]) => form.append(key, String(value)));
  return form;
};

const saveBlob = (blob: Blob, fileName: string): void => {
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
};

/** Las descargas piden un blob: si el servidor responde un error, el mensaje viene dentro de ese blob. */
export async function importErrorMessage(error: unknown, fallback: string): Promise<string> {
  const data = (error as { response?: { data?: unknown } })?.response?.data;
  if (data instanceof Blob) {
    try {
      return JSON.parse(await data.text())?.message || fallback;
    } catch {
      return fallback;
    }
  }
  return (data as { message?: string } | undefined)?.message || fallback;
}

/** Plantilla Excel del colegio y año que se están viendo, con sus aulas en la lista desplegable. */
export const useDownloadImportTemplate = () =>
  useMutation({
    mutationFn: async (year?: number) => {
      const response = await api.get('/students/import/template', { responseType: 'blob' });
      saveBlob(response.data as Blob, `plantilla-alumnos${year ? `-${year}` : ''}.xlsx`);
    },
  });

export const useStudentImportPreview = () =>
  useMutation({
    mutationFn: async (file: File) =>
      (await api.post<Envelope<StudentImportPlan>>('/students/import/preview', formOf(file), UPLOAD)).data.data,
  });

/** Excel con las filas rechazadas y su motivo, para devolverlo al colegio. */
export const useDownloadRejectedRows = () =>
  useMutation({
    mutationFn: async (v: { file: File; year: number }) => {
      const response = await api.post('/students/import/rejected', formOf(v.file), { ...UPLOAD, responseType: 'blob' });
      saveBlob(response.data as Blob, `alumnos-por-corregir-${v.year}.xlsx`);
    },
  });

export const useStudentImportCommit = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (v: { file: File; generateFees: boolean }) =>
      (
        await api.post<Envelope<StudentImportResult>>(
          '/students/import/commit',
          formOf(v.file, { generateFees: v.generateFees }),
          UPLOAD,
        )
      ).data.data,
    onSuccess: () => {
      [
        studentsKeys.all[0],
        classroomsKeys.all[0],
        enrollmentsKeys.all[0],
        academicKeys.all[0],
        usersKeys.all[0],
        'payments',
      ].forEach((key) =>
        queryClient.invalidateQueries({ queryKey: [key] }),
      );
    },
  });
};
