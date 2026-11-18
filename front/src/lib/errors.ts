export type ApiErrorBody = {
  status: 'error' | 'fail';
  message: string;
  errors?: unknown;
  code?: string;
  details?: unknown;
};

export function getApiErrorMessage(error: unknown, fallback = 'No se pudo completar la acción.'): string {
  const msg = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  return typeof msg === 'string' && msg.trim().length > 0 ? msg : fallback;
}

export function getApiErrorCode(error: unknown): string | undefined {
  const code = (error as { response?: { data?: { code?: unknown } } })?.response?.data?.code;
  return typeof code === 'string' ? code : undefined;
}

async function readBlobAsText(blob: Blob): Promise<string> {
  if (typeof blob.text === 'function') {
    return blob.text();
  }
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

export async function getApiErrorMessageFromBlob(error: unknown, fallback: string): Promise<string> {
  const data = (error as { response?: { data?: unknown } })?.response?.data;
  if (data instanceof Blob) {
    try {
      const text = await readBlobAsText(data);
      const parsed = JSON.parse(text);
      if (typeof parsed?.message === 'string' && parsed.message.trim().length > 0) {
        return parsed.message;
      }
      return fallback;
    } catch {
      return fallback;
    }
  }
  return getApiErrorMessage(error, fallback);
}
