import type { AttendanceStatus } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../core/errors/app-error';
import { parseSchoolDate } from '../../utils/timezone.util';
import type {
  SessionQueryDto,
  SaveSessionDto,
  SummaryQueryDto,
} from './course-attendance.schema';

interface RequestUser {
  id: string;
  role: string;
  schoolId?: string;
}

export class CourseAttendanceService {
  private async assertAssignmentAccess(
    schoolId: string,
    courseAssignmentId: string,
    user: RequestUser,
  ) {
    const assignment = await prisma.courseAssignment.findFirst({
      where: {
        id: courseAssignmentId,
        schoolId,
      },
      include: {
        classroom: true,
        area: true,
      },
    });

    if (!assignment) {
      throw new AppError('Asignación de curso no encontrada.', 404);
    }

    if (user.role === 'TEACHER' && assignment.teacherId !== user.id) {
      throw new AppError('Solo el docente del curso puede registrar su asistencia.', 403);
    }

    return assignment;
  }

  async getSession(schoolId: string, dto: SessionQueryDto, user: RequestUser) {
    const assignment = await this.assertAssignmentAccess(schoolId, dto.courseAssignmentId, user);
    const dateObj = parseSchoolDate(dto.date);

    // 1. Obtener alumnos con matrícula activa en el aula y año activo
    const enrollments = await prisma.enrollment.findMany({
      where: {
        schoolId,
        classroomId: assignment.classroomId,
        isActive: true,
        academicYear: { isActive: true },
      },
      include: {
        student: {
          select: {
            id: true,
            firstNames: true,
            lastNamePaternal: true,
            lastNameMaternal: true,
            documentId: true,
            studentCode: true,
          },
        },
      },
      orderBy: [
        { student: { lastNamePaternal: 'asc' } },
        { student: { lastNameMaternal: 'asc' } },
        { student: { firstNames: 'asc' } },
      ],
    });

    // 2. Buscar si la sesión existe
    const session = await prisma.courseAttendanceSession.findUnique({
      where: {
        courseAssignmentId_date_periodLabel: {
          courseAssignmentId: dto.courseAssignmentId,
          date: dateObj,
          periodLabel: dto.periodLabel,
        },
      },
      include: {
        records: true,
      },
    });

    // 3. Obtener la asistencia diaria de la fecha para estos alumnos
    const dailyAttendances = await prisma.attendance.findMany({
      where: {
        schoolId,
        enrollmentId: { in: enrollments.map((e) => e.id) },
        date: dateObj,
      },
      select: {
        enrollmentId: true,
        status: true,
      },
    });
    const dailyMap = new Map<string, AttendanceStatus>();
    dailyAttendances.forEach((d) => dailyMap.set(d.enrollmentId, d.status));

    const recordMap = new Map<string, { status: AttendanceStatus; note: string | null }>();
    if (session) {
      session.records.forEach((r) =>
        recordMap.set(r.enrollmentId, { status: r.status, note: r.note }),
      );
    }

    const students = enrollments.map((e) => {
      const fullName = `${e.student.lastNamePaternal} ${e.student.lastNameMaternal || ''}, ${e.student.firstNames}`
        .replace(/\s+/g, ' ')
        .trim();
      const existing = recordMap.get(e.id);
      const dailyStatus = dailyMap.get(e.id) || null;

      let status: AttendanceStatus = 'PRESENT';
      let note: string | null = null;

      if (session && existing) {
        status = existing.status;
        note = existing.note;
      } else {
        // Sugerir desde la asistencia diaria
        if (dailyStatus && dailyStatus.startsWith('ABSENT_')) {
          status = dailyStatus;
        } else {
          status = 'PRESENT';
        }
      }

      return {
        enrollmentId: e.id,
        fullName,
        documentId: e.student.documentId,
        studentCode: e.student.studentCode || null,
        status,
        note,
        dailyStatus,
      };
    });

    return {
      sessionExists: Boolean(session),
      sessionId: session?.id || null,
      courseAssignmentId: dto.courseAssignmentId,
      date: dto.date,
      periodLabel: dto.periodLabel,
      updatedAt: session?.updatedAt || null,
      students,
    };
  }

  async saveSession(schoolId: string, userId: string, dto: SaveSessionDto, user: RequestUser) {
    const assignment = await this.assertAssignmentAccess(schoolId, dto.courseAssignmentId, user);
    const dateObj = parseSchoolDate(dto.date);

    // Validar que cada enrollmentId pertenezca al aula del curso
    const classroomEnrollments = await prisma.enrollment.findMany({
      where: {
        schoolId,
        classroomId: assignment.classroomId,
        isActive: true,
      },
      select: { id: true },
    });
    const validIds = new Set(classroomEnrollments.map((e) => e.id));
    const hasInvalid = dto.records.some((r) => !validIds.has(r.enrollmentId));
    if (hasInvalid) {
      throw new AppError('Uno o más estudiantes no pertenecen al aula del curso.', 422);
    }

    const session = await prisma.$transaction(async (tx) => {
      const sessionRecord = await tx.courseAttendanceSession.upsert({
        where: {
          courseAssignmentId_date_periodLabel: {
            courseAssignmentId: dto.courseAssignmentId,
            date: dateObj,
            periodLabel: dto.periodLabel,
          },
        },
        create: {
          schoolId,
          courseAssignmentId: dto.courseAssignmentId,
          date: dateObj,
          periodLabel: dto.periodLabel,
          takenById: userId,
        },
        update: {
          takenById: userId,
        },
      });

      for (const rec of dto.records) {
        await tx.courseAttendanceRecord.upsert({
          where: {
            sessionId_enrollmentId: {
              sessionId: sessionRecord.id,
              enrollmentId: rec.enrollmentId,
            },
          },
          create: {
            sessionId: sessionRecord.id,
            enrollmentId: rec.enrollmentId,
            status: rec.status,
            note: rec.note || null,
          },
          update: {
            status: rec.status,
            note: rec.note || null,
          },
        });
      }

      return sessionRecord;
    });

    return session;
  }

  async getSummary(schoolId: string, dto: SummaryQueryDto, user: RequestUser) {
    const assignment = await this.assertAssignmentAccess(schoolId, dto.courseAssignmentId, user);

    const [yearStr, monthStr] = dto.month.split('-');
    const year = parseInt(yearStr, 10);
    const monthNum = parseInt(monthStr, 10);
    const startDate = new Date(Date.UTC(year, monthNum - 1, 1));
    const endDate = new Date(Date.UTC(year, monthNum, 0));

    const [sessions, enrollments] = await Promise.all([
      prisma.courseAttendanceSession.findMany({
        where: {
          schoolId,
          courseAssignmentId: dto.courseAssignmentId,
          date: { gte: startDate, lte: endDate },
        },
        include: {
          records: true,
        },
      }),
      prisma.enrollment.findMany({
        where: {
          schoolId,
          classroomId: assignment.classroomId,
          isActive: true,
          academicYear: { isActive: true },
        },
        include: {
          student: {
            select: {
              firstNames: true,
              lastNamePaternal: true,
              lastNameMaternal: true,
              documentId: true,
            },
          },
        },
        orderBy: [
          { student: { lastNamePaternal: 'asc' } },
          { student: { lastNameMaternal: 'asc' } },
          { student: { firstNames: 'asc' } },
        ],
      }),
    ]);

    const totalSessions = sessions.length;

    const summary = enrollments.map((e) => {
      const fullName = `${e.student.lastNamePaternal} ${e.student.lastNameMaternal || ''}, ${e.student.firstNames}`
        .replace(/\s+/g, ' ')
        .trim();

      let presents = 0;
      let lates = 0;
      let absences = 0;

      for (const sess of sessions) {
        const rec = sess.records.find((r) => r.enrollmentId === e.id);
        if (!rec) continue;
        if (rec.status === 'PRESENT') {
          presents++;
        } else if (rec.status === 'LATE_JUSTIFIED' || rec.status === 'LATE_UNJUSTIFIED') {
          lates++;
        } else if (rec.status === 'ABSENT_JUSTIFIED' || rec.status === 'ABSENT_UNJUSTIFIED') {
          absences++;
        }
      }

      const attended = presents + lates;
      const attendancePercent =
        totalSessions > 0 ? Math.round((attended / totalSessions) * 100) : 100;

      return {
        enrollmentId: e.id,
        fullName,
        documentId: e.student.documentId,
        presents,
        lates,
        absences,
        totalSessions,
        attendancePercent,
      };
    });

    return {
      courseAssignmentId: dto.courseAssignmentId,
      month: dto.month,
      totalSessions,
      summary,
    };
  }
}

export const courseAttendanceService = new CourseAttendanceService();
