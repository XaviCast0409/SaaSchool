import { AppError } from '../../core/errors/app-error';
import type { AuthenticatedUser } from '../../core/interfaces/global.interfaces';

/** Datos del archivo que deciden quién puede leerlo. */
export interface FileAccessTarget {
  purpose: string;
  uploadedById: string;
  uploaderRole: string;
}

/**
 * Verifica que el usuario pueda ver al alumno dueño de una entrega (tutor, docente del curso,
 * apoderado o el propio alumno). Debe lanzar AppError si no tiene acceso.
 */
export type StudentAccessCheck = (user: AuthenticatedUser, studentId: string) => Promise<void>;

const DENIED = () => new AppError('No tienes permiso para ver este archivo.', 403);

/**
 * Quién puede abrir cada archivo del colegio:
 * - Siempre: quien lo subió, la Dirección y el SuperAdmin.
 * - Captura de pago (PAYMENT_VOUCHER): además Secretaría / Caja. Ni otros padres ni docentes ni alumnos.
 * - Tarea entregada (HOMEWORK_SUBMISSION): además Secretaría y quien tenga acceso al alumno que la
 *   entregó (su docente o tutor, sus apoderados). Si la subió un apoderado, solo el personal.
 * - Material de curso, recursos del colegio, fotos de perfil y otros: cualquier usuario del colegio.
 */
export async function assertCanReadFile(
  user: AuthenticatedUser,
  file: FileAccessTarget,
  checkStudentAccess: StudentAccessCheck,
): Promise<void> {
  const myIds = [user.userId, user.studentId].filter(Boolean);
  if (myIds.includes(file.uploadedById)) return;
  if (user.role === 'SUPER_ADMIN' || user.role === 'SCHOOL_ADMIN') return;

  if (file.purpose === 'PAYMENT_VOUCHER') {
    if (user.role === 'ADMINISTRATIVE') return;
    throw DENIED();
  }

  if (file.purpose === 'HOMEWORK_SUBMISSION') {
    if (user.role === 'ADMINISTRATIVE') return;
    if (file.uploaderRole !== 'STUDENT') throw DENIED();
    try {
      await checkStudentAccess(user, file.uploadedById);
    } catch {
      throw DENIED();
    }
    return;
  }
}
