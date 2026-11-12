import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import type { FillResponse, NominaCommitResult, NominaPlan, TemplateImportResult, TemplateInspection } from './types';

interface Envelope<T> { status: string; data: T }

const formOf = (files: File[], extra: Record<string, string | boolean | number | undefined> = {}) => {
  const fd = new FormData();
  files.forEach((f) => fd.append('files', f, f.name));
  Object.entries(extra).forEach(([k, v]) => { if (v !== undefined) fd.append(k, String(v)); });
  return fd;
};

const post = async <T,>(url: string, fd: FormData) =>
  (await api.post<Envelope<T>>(url, fd, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 180_000 })).data.data;

export const useNominaPreview = () =>
  useMutation({ mutationFn: (files: File[]) => post<NominaPlan>('/siagie/nomina/preview', formOf(files)) });

export const useNominaCommit = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { files: File[]; updateExisting: boolean }) =>
      post<NominaCommitResult>('/siagie/nomina/commit', formOf(v.files, { updateExisting: v.updateExisting })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] });
      qc.invalidateQueries({ queryKey: ['classrooms'] });
      qc.invalidateQueries({ queryKey: ['enrollments'] });
      qc.invalidateQueries({ queryKey: ['academic'] });
    },
  });
};

export const useInspectTemplates = () =>
  useMutation({ mutationFn: (files: File[]) => post<TemplateInspection[]>('/siagie/templates/inspect', formOf(files)) });

export const useImportTemplateGrades = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (files: File[]) => post<TemplateImportResult[]>('/siagie/templates/import', formOf(files)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['academic'] }),
  });
};

export const useFillTemplates = () =>
  useMutation({
    mutationFn: (v: { files: File[]; fillFromBank: boolean; overwrite: boolean; period?: string }) =>
      post<FillResponse>('/siagie/templates/fill', formOf(v.files, { fillFromBank: v.fillFromBank, overwrite: v.overwrite, period: v.period })),
  });

export function downloadBase64(fileName: string, contentType: string, base64: string) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const href = URL.createObjectURL(new Blob([bytes], { type: contentType }));
  const a = document.createElement('a');
  a.href = href;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}
