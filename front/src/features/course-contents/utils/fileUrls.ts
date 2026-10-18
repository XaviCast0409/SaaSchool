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
    const envApi = (import.meta as unknown as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL;
    const backendBase = envApi ? envApi.replace('/api', '') : 'http://localhost:3000';
    return `${backendBase}${url}`;
  }

  return url;
};
