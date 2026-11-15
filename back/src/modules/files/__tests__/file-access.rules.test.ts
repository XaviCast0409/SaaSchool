import { describe, it, expect, vi } from 'vitest';
import { assertCanReadFile, type FileAccessTarget } from '../file-access.rules';
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
});
