import { prisma } from '../../config/prisma';
import type { User, Student } from '@prisma/client';

export class AuthRepository {
  /** Devuelve hasta 2 usuarios que coincidan (para detectar ambigüedad entre colegios). */
  async findUsersByIdentifier(identifier: string): Promise<User[]> {
    const clean = identifier.trim();
    return prisma.user.findMany({
      where: {
        OR: [{ email: { equals: clean, mode: 'insensitive' } }, { documentId: clean }],
      },
      take: 2,
    });
  }

  /** Devuelve hasta 2 estudiantes que coincidan por DNI o código SIAGIE. */
  async findStudentsByIdentifier(identifier: string): Promise<Student[]> {
    const clean = identifier.trim();
    return prisma.student.findMany({
      where: { OR: [{ documentId: clean }, { studentCode: clean }] },
      take: 2,
    });
  }

  async findUserById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
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
