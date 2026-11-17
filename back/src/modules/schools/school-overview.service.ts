import { prisma } from '../../config/prisma';
import { AppError } from '../../core/errors/app-error';
import { buildOnboarding, isProfileComplete, profileMissingFields, type OnboardingStatus } from './onboarding.rules';

/**
 * Ficha del colegio para SUPER_ADMIN: estado de puesta en marcha y notas internas del equipo.
 * Las notas nunca se exponen al colegio (todas las rutas son exclusivas de SUPER_ADMIN).
 */
export class SchoolOverviewService {
  async onboarding(schoolId: string): Promise<OnboardingStatus> {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true, modularCode: true, phone: true, email: true, address: true, logoUrl: true },
    });
    if (!school) throw new AppError('Colegio no encontrado', 404);

    const [adminLoggedIn, activeYears, classrooms, teachers, students, courseAssignments, familyLinks, paymentObligations, attendance, feeSchedules] =
      await Promise.all([
        prisma.user.count({
          where: { schoolId, role: 'SCHOOL_ADMIN', OR: [{ mustChangePassword: false }, { lastSeenAt: { not: null } }] },
        }),
        prisma.academicYear.count({ where: { schoolId, isActive: true } }),
        prisma.classroom.count({ where: { schoolId } }),
        prisma.user.count({ where: { schoolId, role: 'TEACHER', isActive: true } }),
        prisma.student.count({ where: { schoolId } }),
        prisma.courseAssignment.count({ where: { schoolId } }),
        prisma.familyRelationship.count({ where: { student: { schoolId } } }),
        prisma.paymentObligation.count({ where: { schoolId } }),
        // Basta saber si existe al menos un registro
        prisma.attendance.findFirst({ where: { schoolId }, select: { id: true } }),
        prisma.feeSchedule.count({ where: { schoolId } }),
      ]);

    return buildOnboarding({
      profileComplete: isProfileComplete(school),
      profileMissing: profileMissingFields(school),
      feeSchedules,
      adminHasLoggedIn: adminLoggedIn > 0,
      activeYears,
      classrooms,
      teachers,
      students,
      courseAssignments,
      familyLinks,
      paymentObligations,
      attendanceRecords: attendance ? 1 : 0,
    });
  }

  async listNotes(schoolId: string) {
    await this.ensureSchool(schoolId);
    return prisma.schoolNote.findMany({
      where: { schoolId },
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async createNote(schoolId: string, body: string, author: { userId: string; email?: string | null }) {
    await this.ensureSchool(schoolId);
    return prisma.schoolNote.create({
      data: { schoolId, body, authorId: author.userId, authorEmail: author.email ?? null },
    });
  }

  async updateNote(schoolId: string, noteId: string, data: { body?: string; pinned?: boolean }) {
    await this.ensureNote(schoolId, noteId);
    return prisma.schoolNote.update({ where: { id: noteId }, data });
  }

  async deleteNote(schoolId: string, noteId: string): Promise<void> {
    await this.ensureNote(schoolId, noteId);
    await prisma.schoolNote.delete({ where: { id: noteId } });
  }

  private async ensureSchool(schoolId: string): Promise<void> {
    const exists = await prisma.school.findUnique({ where: { id: schoolId }, select: { id: true } });
    if (!exists) throw new AppError('Colegio no encontrado', 404);
  }

  private async ensureNote(schoolId: string, noteId: string): Promise<void> {
    const note = await prisma.schoolNote.findFirst({ where: { id: noteId, schoolId }, select: { id: true } });
    if (!note) throw new AppError('Nota no encontrada', 404);
  }
}
