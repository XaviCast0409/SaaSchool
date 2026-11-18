import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/axios';
import { academicKeys } from './keys';
import { getApiErrorMessage as apiErrorMessage } from '@/lib/errors';

export interface Envelope<T> {
  status: string;
  data: T;
}

export const get = async <T>(url: string, params?: Record<string, unknown>) =>
  (await api.get<Envelope<T>>(url, { params })).data.data;

export const useInvalidate = () => {
  const qc = useQueryClient();
  return (...keys: string[]) => keys.forEach((k) => qc.invalidateQueries({ queryKey: academicKeys.sub(k) }));
};

export const planMutation =
  <V>(fn: (v: V) => Promise<unknown>, success: string) =>
  () => {
    const invalidate = useInvalidate();

    return useMutation({
      mutationFn: fn,
      onSuccess: () => {
        invalidate('plan', 'setup', 'load');
        toast.success(success);
      },
      onError: (e) => toast.error(apiErrorMessage(e)),
    });
  };

export async function downloadFile(url: string, params: Record<string, unknown>, filename: string): Promise<boolean> {
  try {
    const response = await api.get(url, { params, responseType: 'blob' });
    const blob = response.data as Blob;
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = filename.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '_');
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
    return true;
  } catch (e) {
    let message: string | undefined;
    const data = (e as { response?: { data?: unknown } })?.response?.data;
    if (data instanceof Blob) {
      try {
        message = JSON.parse(await data.text())?.message;
      } catch {
        /* respuesta no JSON */
      }
    }
    toast.error(message || apiErrorMessage(e, 'No se pudo descargar el archivo.'));
    return false;
  }
}

