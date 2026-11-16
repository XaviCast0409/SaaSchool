import { describe, it, expect, vi } from 'vitest';
import { assertCanReadFile, resolveUploadPurpose, type FileAccessTarget } from '../file-access.rules';
import { AppError } from '../../../core/errors/app-error';

const user = (role: string, userId = 'u-actor', studentId?: string) => ({ userId, studentId, schoolId: 's1', role });
const voucher: FileAccessTarget = { purpose: 'PAYMENT_VOUCHER', uploadedById: 'parent-owner', uploaderRole: 'PARENT' };
const homework: FileAccessTarget = { purpose: 'HOMEWORK_SUBMISSION', uploadedById: 'student-1', uploaderRole: 'STUDENT' };
const material: FileAccessTarget = { purpose: 'COURSE_MATERIAL', uploadedById: 'teacher-1', uploaderRole: 'TEACHER' };

const allow = vi.fn(async () => undefined);
const deny = vi.fn(async () => {
  throw new AppError('No tienes permisos sobre este estudiante.', 403);
});

describe('assertCanReadFile', () => {
  it('quien subió el archivo siempre puede verlo', async () => {
    await expect(assertCanReadFile(user('PARENT', 'parent-owner'), voucher, deny)).resolves.toBeUndefined();
    await expect(assertCanReadFile(user('STUDENT', 'x', 'student-1'), homework, deny)).resolves.toBeUndefined();
  });

  it('captura de pago: otro padre, un docente o un alumno no pueden verla', async () => {
    for (const role of ['PARENT', 'TEACHER', 'STUDENT']) {
      await expect(assertCanReadFile(user(role), voucher, allow)).rejects.toMatchObject({ statusCode: 403 });
    }
  });

  it('captura de pago: Dirección y Secretaría sí pueden verla', async () => {
    for (const role of ['SCHOOL_ADMIN', 'ADMINISTRATIVE', 'SUPER_ADMIN']) {
      await expect(assertCanReadFile(user(role), voucher, deny)).resolves.toBeUndefined();
    }
  });

  it('tarea: depende del acceso al alumno que la entregó', async () => {
    await expect(assertCanReadFile(user('TEACHER'), homework, allow)).resolves.toBeUndefined();
    await expect(assertCanReadFile(user('PARENT'), homework, allow)).resolves.toBeUndefined();
    await expect(assertCanReadFile(user('TEACHER'), homework, deny)).rejects.toMatchObject({ statusCode: 403 });
    await expect(assertCanReadFile(user('STUDENT', 'x', 'student-2'), homework, deny)).rejects.toMatchObject({ statusCode: 403 });
  });

  it('tarea subida por un apoderado: solo el personal y quien la subió', async () => {
    const byParent: FileAccessTarget = { ...homework, uploadedById: 'parent-owner', uploaderRole: 'PARENT' };
    await expect(assertCanReadFile(user('TEACHER'), byParent, allow)).rejects.toMatchObject({ statusCode: 403 });
    await expect(assertCanReadFile(user('ADMINISTRATIVE'), byParent, deny)).resolves.toBeUndefined();
  });

  it('material de curso: cualquier usuario del colegio', async () => {
    for (const role of ['PARENT', 'STUDENT', 'TEACHER']) {
      await expect(assertCanReadFile(user(role), material, deny)).resolves.toBeUndefined();
    }
  });

  it('justificación de inasistencia: solo quien tiene acceso a ese alumno y Secretaría', async () => {
    const medical: FileAccessTarget = { purpose: 'ATTENDANCE_JUSTIFICATION', uploadedById: 'parent-owner', uploaderRole: 'PARENT', studentId: 'student-1' };
    const check = vi.fn(async (_u: unknown, studentId: string) => {
      if (studentId !== 'student-1') throw new AppError('x', 403);
    });
    await expect(assertCanReadFile(user('TEACHER'), medical, check)).resolves.toBeUndefined();
    expect(check).toHaveBeenCalledWith(expect.anything(), 'student-1');
    await expect(assertCanReadFile(user('PARENT'), medical, deny)).rejects.toMatchObject({ statusCode: 403 });
    await expect(assertCanReadFile(user('TEACHER'), medical, deny)).rejects.toMatchObject({ statusCode: 403 });
    await expect(assertCanReadFile(user('ADMINISTRATIVE'), medical, deny)).resolves.toBeUndefined();
  });

  it('documento del alumno sin estudiante asociado: negado', async () => {
    const orphan: FileAccessTarget = { purpose: 'STUDENT_DOCUMENT', uploadedById: 'staff-1', uploaderRole: 'ADMINISTRATIVE', studentId: null };
    await expect(assertCanReadFile(user('TEACHER'), orphan, allow)).rejects.toMatchObject({ statusCode: 403 });
  });

  it('recursos docentes: solo el personal', async () => {
    const resource: FileAccessTarget = { purpose: 'STAFF_RESOURCE', uploadedById: 'teacher-1', uploaderRole: 'TEACHER' };
    await expect(assertCanReadFile(user('TEACHER'), resource, deny)).resolves.toBeUndefined();
    await expect(assertCanReadFile(user('PARENT'), resource, allow)).rejects.toMatchObject({ statusCode: 403 });
    await expect(assertCanReadFile(user('STUDENT'), resource, allow)).rejects.toMatchObject({ statusCode: 403 });
  });

  it('propósito desconocido o antiguo (OTHER): negado por defecto', async () => {
    const other: FileAccessTarget = { purpose: 'OTHER', uploadedById: 'teacher-1', uploaderRole: 'TEACHER' };
    for (const role of ['PARENT', 'STUDENT', 'TEACHER', 'ADMINISTRATIVE']) {
      await expect(assertCanReadFile(user(role), other, allow)).rejects.toMatchObject({ statusCode: 403 });
    }
    await expect(assertCanReadFile(user('SCHOOL_ADMIN'), other, deny)).resolves.toBeUndefined();
  });
});

describe('resolveUploadPurpose', () => {
  it('la familia no puede marcar sus archivos como material del colegio', () => {
    expect(resolveUploadPurpose('PARENT', 'COURSE_MATERIAL')).toBe('HOMEWORK_SUBMISSION');
    expect(resolveUploadPurpose('STUDENT', 'SCHOOL_ASSET')).toBe('HOMEWORK_SUBMISSION');
    expect(resolveUploadPurpose('STUDENT', 'ATTENDANCE_JUSTIFICATION')).toBe('HOMEWORK_SUBMISSION');
    expect(resolveUploadPurpose('PARENT', 'ATTENDANCE_JUSTIFICATION')).toBe('ATTENDANCE_JUSTIFICATION');
    expect(resolveUploadPurpose('PARENT', 'PAYMENT_VOUCHER')).toBe('PAYMENT_VOUCHER');
  });

  it('el personal elige entre los propósitos válidos; si no indica, material de curso', () => {
    expect(resolveUploadPurpose('TEACHER', undefined)).toBe('COURSE_MATERIAL');
    expect(resolveUploadPurpose('ADMINISTRATIVE', 'STUDENT_DOCUMENT')).toBe('STUDENT_DOCUMENT');
    expect(resolveUploadPurpose('TEACHER', 'STAFF_RESOURCE')).toBe('STAFF_RESOURCE');
    expect(resolveUploadPurpose('TEACHER', 'INVENTADO')).toBe('COURSE_MATERIAL');
  });
});
