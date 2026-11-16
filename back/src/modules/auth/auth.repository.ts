import { prisma } from '../../config/prisma';
import type { User, Student } from '@prisma/client';

/** Máximo de cuentas que se evalúan para un mismo usuario/documento (una por colegio). */
export const MAX_LOGIN_CANDIDATES = 8;

export class AuthRepository {
  /** Colegio activo por su código (página de ingreso /c/<código>). */
  async findActiveSchoolIdBySlug(slug: string): Promise<string | null> {
    const school = await prisma.school.findFirst({ where: { slug, isActive: true }, select: { id: true } });
    return school?.id ?? null;
  }

  async findSchoolBySlug(slug: string): Promise<{ id: string; isActive: boolean } | null> {
    return prisma.school.findFirst({ where: { slug }, select: { id: true, isActive: true } });
  }

  async findSchoolById(id: string): Promise<{ id: string; isActive: boolean } | null> {
    return prisma.school.findUnique({ where: { id }, select: { id: true, isActive: true } });
  }

  /**
   * Usuarios que coinciden por correo o documento. Puede haber uno por colegio (un apoderado con hijos
   * en varios colegios). Con `schoolId` la búsqueda se limita a ese colegio.
   */
  async findUsersByIdentifier(identifier: string, schoolId?: string): Promise<User[]> {
    const clean = identifier.trim();
    return prisma.user.findMany({
      where: {
        ...(schoolId ? { schoolId } : {}),
        OR: [{ email: { equals: clean, mode: 'insensitive' } }, { documentId: clean }],
      },
      orderBy: { createdAt: 'asc' },
      take: MAX_LOGIN_CANDIDATES,
    });
  }

  /** Estudiantes que coinciden por DNI o código SIAGIE (opcionalmente en un colegio). */
  async findStudentsByIdentifier(identifier: string, schoolId?: string): Promise<Student[]> {
    const clean = identifier.trim();
    return prisma.student.findMany({
      where: { ...(schoolId ? { schoolId } : {}), OR: [{ documentId: clean }, { studentCode: clean }] },
      orderBy: { createdAt: 'asc' },
      take: MAX_LOGIN_CANDIDATES,
    });
  }

  /** Nombre y código de los colegios (para que el usuario elija a cuál entrar). */
  async findSchoolsSummary(ids: string[]): Promise<Array<{ id: string; name: string; slug: string | null; logoUrl: string | null }>> {
    return prisma.school.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, slug: true, logoUrl: true },
    });
  }

  async findUserById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  /** Cuentas activas con ese correo: una por cada colegio en que esté registrado. */
  async findActiveUsersByEmail(email: string): Promise<Array<User & { school: { name: string } }>> {
    const clean = email.trim().toLowerCase();
    return prisma.user.findMany({
      where: { email: { equals: clean, mode: 'insensitive' }, isActive: true },
      include: { school: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
      take: MAX_LOGIN_CANDIDATES,
    });
  }

  async createPasswordResetToken(data: { userId: string; tokenHash: string; expiresAt: Date }): Promise<void> {
    await prisma.passwordResetToken.create({
      data,
    });
  }

  async findPasswordResetToken(tokenHash: string) {
    return prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
  }

  async markPasswordResetTokenUsed(id: string): Promise<void> {
    await prisma.passwordResetToken.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  async findStudentById(studentId: string): Promise<Student | null> {
    return prisma.student.findUnique({ where: { id: studentId } });
  }

  async updateUserPassword(userId: string, passwordHash: string, mustChangePassword: boolean): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        mustChangePassword,
        passwordChangedAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
  }

  async updateStudentPassword(studentId: string, passwordHash: string, mustChangePassword: boolean): Promise<Student> {
    return prisma.student.update({
      where: { id: studentId },
      data: {
        passwordHash,
        mustChangePassword,
        passwordChangedAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
  }

  async registerFailedUserLogin(userId: string, maxAttempts: number, lockMinutes: number): Promise<void> {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: { increment: 1 } },
      select: { failedLoginAttempts: true },
    });
    if (updated.failedLoginAttempts >= maxAttempts) {
      await prisma.user.update({
        where: { id: userId },
        data: { failedLoginAttempts: 0, lockedUntil: new Date(Date.now() + lockMinutes * 60_000) },
      });
    }
  }

  async registerFailedStudentLogin(studentId: string, maxAttempts: number, lockMinutes: number): Promise<void> {
    const updated = await prisma.student.update({
      where: { id: studentId },
      data: { failedLoginAttempts: { increment: 1 } },
      select: { failedLoginAttempts: true },
    });
    if (updated.failedLoginAttempts >= maxAttempts) {
      await prisma.student.update({
        where: { id: studentId },
        data: { failedLoginAttempts: 0, lockedUntil: new Date(Date.now() + lockMinutes * 60_000) },
      });
    }
  }

  async resetUserLoginCounters(userId: string): Promise<void> {
    await prisma.user.update({ where: { id: userId }, data: { failedLoginAttempts: 0, lockedUntil: null } });
  }

  async resetStudentLoginCounters(studentId: string): Promise<void> {
    await prisma.student.update({ where: { id: studentId }, data: { failedLoginAttempts: 0, lockedUntil: null } });
  }
}
