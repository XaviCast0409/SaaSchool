import { api } from '@/lib/axios';
import { toast } from 'sonner';

/**
 * Utilidades para procesamiento y transformación de enlaces de descarga
 * Soporta Google Drive (conversión automática a descarga directa en 1 clic), Dropbox, OneDrive y archivos locales.
 */

export const extractGoogleDriveId = (url: string): string | null => {
  if (!url) return null;
  // Formato: https://drive.google.com/file/d/FILE_ID/view?usp=sharing
  const fileDMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch && fileDMatch[1]) {
    return fileDMatch[1];
  }
  // Formato: https://drive.google.com/open?id=FILE_ID o ?id=FILE_ID
  const idParamMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParamMatch && idParamMatch[1]) {
    return idParamMatch[1];
  }
  return null;
};

export const isGoogleDriveUrl = (url?: string | null): boolean => {
  if (!url) return false;
  return url.includes('drive.google.com') || url.includes('docs.google.com');
};

/**
 * Convierte cualquier enlace en un enlace de DESCARGA DIRECTA en 1 solo clic
 */
export const getDirectDownloadUrl = (url?: string | null): string => {
  if (!url) return '#';

  // 1. Google Drive: transformar enlace de visualizador a descarga directa en 1 clic
  if (isGoogleDriveUrl(url)) {
    const driveId = extractGoogleDriveId(url);
    if (driveId) {
      return `https://drive.google.com/uc?export=download&id=${driveId}`;
    }
    return url;
  }

  // 2. Dropbox: cambiar dl=0 por dl=1 para descarga directa
  if (url.includes('dropbox.com')) {
    if (url.includes('dl=0')) {
      return url.replace('dl=0', 'dl=1');
    }
    if (!url.includes('dl=1')) {
      return url.includes('?') ? `${url}&dl=1` : `${url}?dl=1`;
    }
    return url;
  }

  // 3. Archivos locales subidos al SaaS (/uploads/materials/...)
  if (url.startsWith('/uploads')) {
    const envApi = import.meta.env.VITE_API_URL;
    const backendBase = envApi ? envApi.replace('/api', '') : 'http://localhost:3000';
    return `${backendBase}${url}`;
  }

  return url;
};

/**
 * Convierte cualquier enlace en una URL embebible para visualización en modal o iframe
 */
export const getPreviewUrl = (url?: string | null): string => {
  if (!url) return '';

  if (isGoogleDriveUrl(url)) {
    const driveId = extractGoogleDriveId(url);
    if (driveId) {
      return `https://drive.google.com/file/d/${driveId}/preview`;
    }
  }

  if (url.startsWith('/uploads')) {
    const envApi = import.meta.env.VITE_API_URL;
    const backendBase = envApi ? envApi.replace('/api', '') : 'http://localhost:3000';
    return `${backendBase}${url}`;
  }

  return url;
};

/**
 * Determina si el archivo es una imagen directa
 */
export const isImageUrl = (url?: string | null, fileName?: string | null): boolean => {
  const target = (fileName || url || '').toLowerCase();
  return (
    target.endsWith('.png') ||
    target.endsWith('.jpg') ||
    target.endsWith('.jpeg') ||
    target.endsWith('.webp') ||
    target.endsWith('.gif') ||
    target.endsWith('.svg')
  );
};

export const getInternalFileId = (url?: string | null): string | null =>
  url?.match(/^\/api\/files\/([0-9a-f-]{36})$/i)?.[1] ?? null;

export const isInternalFileUrl = (url?: string | null): boolean => Boolean(getInternalFileId(url));

/** Devuelve una URL utilizable: firmada (archivos internos) o la transformada actual (enlaces externos). */
export async function resolveFileUrl(url: string, options: { download?: boolean } = {}): Promise<string> {
  const id = getInternalFileId(url);
  if (!id) {
    return options.download ? getDirectDownloadUrl(url) : getPreviewUrl(url) || url;
  }
  const response = await api.get<{ status: string; data: { url: string; downloadUrl: string } }>(`/files/${id}/link`);
  return options.download ? response.data.data.downloadUrl : response.data.data.url;
}

/** Abre un archivo en una pestaña nueva (la abre antes del await para evitar el bloqueo de ventanas emergentes). */
export async function openFile(url: string, options: { download?: boolean } = {}): Promise<void> {
  const newWindow = window.open('', '_blank');
  try {
    const resolved = await resolveFileUrl(url, options);
    if (newWindow) {
      newWindow.opener = null;
      newWindow.location.href = resolved;
    } else {
      window.location.href = resolved;
    }
  } catch {
    newWindow?.close();
    toast.error('No se pudo abrir el archivo. Intenta nuevamente.');
  }
}


