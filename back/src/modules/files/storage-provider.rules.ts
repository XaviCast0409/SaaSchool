import path from 'path';
import type { FileStorage } from '@prisma/client';

/**
 * Elige dónde se guardan los archivos NUEVOS. Los ya guardados se siguen leyendo
 * desde donde estén (cada StoredFile indica su almacenamiento).
 *
 * Sin preferencia: R2 > Google Drive > disco local (solo en desarrollo).
 * Devuelve null cuando no hay ningún almacenamiento utilizable.
 */
export const resolveStorageProvider = (input: {
  forced?: 'r2' | 'drive' | 'local';
  r2Configured: boolean;
  driveConfigured: boolean;
  isProduction: boolean;
}): FileStorage | null => {
  switch (input.forced) {
    case 'r2':
      return input.r2Configured ? 'R2' : null;
    case 'drive':
      return input.driveConfigured ? 'GOOGLE_DRIVE' : null;
    case 'local':
      return input.isProduction ? null : 'LOCAL';
    default:
      if (input.r2Configured) return 'R2';
      if (input.driveConfigured) return 'GOOGLE_DRIVE';
      return input.isProduction ? null : 'LOCAL';
  }
};

/** Extensión segura para la clave: minúsculas, solo letras y números, máximo 10 caracteres. */
const safeExtension = (fileName: string): string => {
  const ext = path.extname(fileName).toLowerCase().replace(/[^a-z0-9.]/g, '');
  return /^\.[a-z0-9]{1,10}$/.test(ext) ? ext : '';
};

/**
 * Clave del objeto en R2: <colegio>/<año>/<propósito>/<uuid><ext>.
 * El nombre original NO va en la clave (puede tener datos personales); se guarda en la BD.
 */
export const buildObjectKey = (input: {
  schoolId: string;
  purpose: string;
  fileName: string;
  id: string;
  now?: Date;
}): string => {
  const year = (input.now ?? new Date()).getFullYear();
  const purpose = input.purpose.replace(/[^A-Z0-9_]/gi, '') || 'OTHER';
  return `${input.schoolId}/${year}/${purpose}/${input.id}${safeExtension(input.fileName)}`;
};

/** Prefijo de la "papelera": un archivo borrado se mueve aquí y una regla de R2 lo elimina a los 30 días. */
export const TRASH_PREFIX = 'papelera/';
export const trashKeyFor = (objectKey: string): string => `${TRASH_PREFIX}${objectKey}`;
