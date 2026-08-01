import { prisma } from '../../config/prisma';
import type { Attendance, Prisma } from '@prisma/client';
import type {
  AttendanceFilterDto,
  AttendanceSummaryQueryDto,
  BulkAttendanceDto,
  CreateAttendanceDto,
  UpdateAttendanceDto,
} from './attendance.schema';

export interface AttendanceMonthlySummary {
  period: string;
  totalRecords: number;
  counts: {
    PRESENT: number;
    ABSENT_JUSTIFIED: number;
    ABSENT_UNJUSTIFIED: number;
    LATE_JUSTIFIED: number;
    LATE_UNJUSTIFIED: number;
  };
  percentages: {
    presentRate: number;
    absentRate: number;
    lateRate: number;
  };
}

const ATTENDANCE_INCLUDE = {
  enrollment: {
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
      classroom: {
        select: {
          id: true,
          grade: true,
          section: true,
          educationLevel: true,
        },
      },
    },
  },
} as const;

export class AttendanceRepository {
  /** Busca un registro de asistencia por ID garantizando pertenencia al colegio. */
  async findById(attendanceId: string, schoolId: string): Promise<Attendance | null> {
    return prisma.attendance.findFirst({
      where: { id: attendanceId, schoolId },
      include: ATTENDANCE_INCLUDE,
    });
  }

  /**
   * Busca asistencias filtrando por schoolId, fecha (opcional) y aula/sección (opcional).
   */
  async findBySchoolAndFilters(
    schoolId: string,
    filters: AttendanceFilterDto,
  ): Promise<Attendance[]> {
    const where: Prisma.AttendanceWhereInput = {
      schoolId,
      ...(filters.date ? { date: new Date(filters.date) } : {}),
      ...(filters.classroomId
        ? {
            enrollment: {
              classroomId: filters.classroomId,
            },
          }
        : {}),
    };

    return prisma.attendance.findMany({
      where,
      include: ATTENDANCE_INCLUDE,
      orderBy: {
        enrollment: {
          student: {
            lastNamePaternal: 'asc',
          },
        },
      },
    });
  }

  /** Busca el historial de asistencias de un alumno por su ID de matrícula. */
  async findByEnrollment(enrollmentId: string, schoolId: string): Promise<Attendance[]> {
    return prisma.attendance.findMany({
      where: { enrollmentId, schoolId },
      include: ATTENDANCE_INCLUDE,
      orderBy: { date: 'desc' },
    });
  }

  /** Crea un registro de asistencia individual. */
  async create(schoolId: string, data: CreateAttendanceDto): Promise<Attendance> {
    return prisma.attendance.create({
      data: {
        schoolId,
        enrollmentId: data.enrollmentId,
        date: new Date(data.date),
        status: data.status,
        notes: data.notes,
      },
      include: ATTENDANCE_INCLUDE,
    });
  }

  /** Crea registros de asistencia en masa para toda la sección. */
  async bulkCreate(
    schoolId: string,
    bulkData: BulkAttendanceDto,
  ): Promise<{ count: number }> {
    return prisma.attendance.createMany({
      data: bulkData.records.map((record) => ({
        schoolId,
        enrollmentId: record.enrollmentId,
        date: new Date(bulkData.date),
        status: record.status,
        notes: record.notes,
      })),
      skipDuplicates: true,
    });
  }

  /** Actualiza la asistencia (corregir estado u observaciones). */
  async update(
    attendanceId: string,
    schoolId: string,
    data: UpdateAttendanceDto,
  ): Promise<Attendance> {
    return prisma.attendance.update({
      where: { id: attendanceId, schoolId },
      data: {
        status: data.status,
        notes: data.notes,
        ...(data.date ? { date: new Date(data.date) } : {}),
      },
      include: ATTENDANCE_INCLUDE,
    });
  }

  /** Genera el resumen/reporte de asistencia mensual de la institución o por aula. */
  async getMonthlySummary(
    schoolId: string,
    query: AttendanceSummaryQueryDto,
  ): Promise<AttendanceMonthlySummary> {
    const now = new Date();
    const period = query.month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const [yearStr, monthStr] = period.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const where: Prisma.AttendanceWhereInput = {
      schoolId,
      date: {
        gte: startDate,
        lte: endDate,
      },
      ...(query.classroomId
        ? {
            enrollment: {
              classroomId: query.classroomId,
            },
          }
        : {}),
    };

    const records = await prisma.attendance.findMany({
      where,
      select: { status: true },
    });

    const totalRecords = records.length;

    const counts = {
      PRESENT: 0,
      ABSENT_JUSTIFIED: 0,
      ABSENT_UNJUSTIFIED: 0,
      LATE_JUSTIFIED: 0,
      LATE_UNJUSTIFIED: 0,
    };

    for (const record of records) {
      if (counts[record.status] !== undefined) {
        counts[record.status]++;
      }
    }

    const presentTotal = counts.PRESENT;
    const absentTotal = counts.ABSENT_JUSTIFIED + counts.ABSENT_UNJUSTIFIED;
    const lateTotal = counts.LATE_JUSTIFIED + counts.LATE_UNJUSTIFIED;

    const percentages = {
      presentRate: totalRecords > 0 ? Number(((presentTotal / totalRecords) * 100).toFixed(2)) : 0,
      absentRate: totalRecords > 0 ? Number(((absentTotal / totalRecords) * 100).toFixed(2)) : 0,
      lateRate: totalRecords > 0 ? Number(((lateTotal / totalRecords) * 100).toFixed(2)) : 0,
    };

    return {
      period,
      totalRecords,
      counts,
      percentages,
    };
  }
}
