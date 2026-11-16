import { AppError } from '../../core/errors/app-error';
import type { AuthenticatedUser } from '../../core/interfaces/global.interfaces';

/** Datos del archivo que deciden quién puede leerlo. */
export interface FileAccessTarget {
  purpose: string;
  uploadedById: string;
  uploaderRole: string;
  /** Estudiante al que pertenece (justificaciones, documentos). */
  studentId?: string | null;
}

/**
 * Verifica que el usuario pueda ver a un alumno (tutor, docente del curso, apoderado o el propio
 * alumno; Dirección y Secretaría siempre). Debe lanzar AppError si no tiene acceso.
 */
export type StudentAccessCheck = (user: AuthenticatedUser, studentId: string) => Promise<void>;

/** Propósitos que se pueden pedir al subir un archivo. */
export const FILE_PURPOSES = [
  'COURSE_MATERIAL',
  'SCHOOL_ASSET',
  'STAFF_RESOURCE',
  'PAYMENT_VOUCHER',
  'HOMEWORK_SUBMISSION',
  'ATTENDANCE_JUSTIFICATION',
  'STUDENT_DOCUMENT',
] as const;
export type UploadPurpose = (typeof FILE_PURPOSES)[number];

/** Propósitos que exigen indicar el estudiante dueño del archivo. */
export const STUDENT_PURPOSES = new Set<string>(['ATTENDANCE_JUSTIFICATION', 'STUDENT_DOCUMENT']);

/** Visibles para cualquier usuario del colegio (contenido pensado para compartirse). */
const SCHOOL_WIDE = new Set(['COURSE_MATERIAL', 'SCHOOL_ASSET', 'PROFILE_PHOTO']);
const STAFF_ROLES = new Set(['ADMINISTRATIVE', 'TEACHER']);

const DENIED = () => new AppError('No tienes permiso para ver este archivo.', 403);

/**
 * Quién puede abrir cada archivo del colegio. Se NIEGA por defecto: un propósito desconocido
 * (o archivos antiguos marcados "OTHER") solo los ve quien los subió y la Dirección.
 * - Siempre: quien lo subió, la Dirección y el SuperAdmin.
 * - Material de curso, recursos del colegio y fotos de perfil: cualquier usuario del colegio.
 * - Recursos docentes (STAFF_RESOURCE): solo el personal.
 * - Captura de pago (PAYMENT_VOUCHER): además Secretaría / Caja.
 * - Tarea entregada (HOMEWORK_SUBMISSION): además Secretaría y quien tenga acceso al alumno que la
 *   entregó (su docente o tutor, sus apoderados). Si la subió un apoderado, solo el personal.
 * - Justificación de inasistencia y documentos del alumno (certificados médicos, constancias, fotos
 *   de quien lo recoge): Secretaría y quien tenga acceso a ESE alumno (tutor, docentes, apoderados).
 */
export async function assertCanReadFile(
  user: AuthenticatedUser,
  file: FileAccessTarget,
  checkStudentAccess: StudentAccessCheck,
): Promise<void> {
  const myIds = [user.userId, user.studentId].filter(Boolean);
  if (myIds.includes(file.uploadedById)) return;
  if (user.role === 'SUPER_ADMIN' || user.role === 'SCHOOL_ADMIN') return;

  if (SCHOOL_WIDE.has(file.purpose)) return;

  switch (file.purpose) {
    case 'STAFF_RESOURCE':
      if (STAFF_ROLES.has(user.role)) return;
      throw DENIED();

    case 'PAYMENT_VOUCHER':
      if (user.role === 'ADMINISTRATIVE') return;
      throw DENIED();

    case 'HOMEWORK_SUBMISSION':
      if (user.role === 'ADMINISTRATIVE') return;
      if (file.uploaderRole !== 'STUDENT') throw DENIED();
      try {
        await checkStudentAccess(user, file.uploadedById);
      } catch {
        throw DENIED();
      }
      return;

    case 'ATTENDANCE_JUSTIFICATION':
    case 'STUDENT_DOCUMENT':
      if (user.role === 'ADMINISTRATIVE') return;
      if (!file.studentId) throw DENIED();
      try {
        await checkStudentAccess(user, file.studentId);
      } catch {
        throw DENIED();
      }
      return;

    default:
      throw DENIED();
  }
}

/** Propósito efectivo de una subida según el rol (nunca uno que el rol no pueda pedir). */
export function resolveUploadPurpose(role: string, requested: string | undefined): UploadPurpose {
  const isFamily = role === 'PARENT' || role === 'STUDENT';
  if (requested === 'PAYMENT_VOUCHER') return 'PAYMENT_VOUCHER';
  if (isFamily) {
    if (requested === 'ATTENDANCE_JUSTIFICATION' && role === 'PARENT') return 'ATTENDANCE_JUSTIFICATION';
    return 'HOMEWORK_SUBMISSION';
  }
  if (requested && (FILE_PURPOSES as readonly string[]).includes(requested)) return requested as UploadPurpose;
  return 'COURSE_MATERIAL';
}
