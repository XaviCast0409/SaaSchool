import { prisma } from '../../config/prisma';
import type { Attendance, AttendanceStatus, Prisma } from '@prisma/client';
import type {
  AttendanceFilterDto,
  AttendanceSummaryQueryDto,
  AttendanceExportQueryDto,
  AttendanceMatrixQueryDto,
  StudentAttendanceQueryDto,
  BulkAttendanceDto,
  CreateAttendanceDto,
  UpdateAttendanceDto,
} from './attendance.schema';
import type { PaginatedResult } from '../../core/interfaces/global.interfaces';

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

/** Datos de alumno para el reporte de exportación mensual */
export interface AttendanceExportRow {
  studentName: string;
  documentId: string;
  grade: string;
  section: string;
  counts: {
    PRESENT: number;
    ABSENT_JUSTIFIED: number;
    ABSENT_UNJUSTIFIED: number;
    LATE_JUSTIFIED: number;
    LATE_UNJUSTIFIED: number;
  };
  attendanceRate: number;
}

/** Estructura de fila para la matriz sábana mensual por días (1..31) */
export interface AttendanceMatrixStudentRow {
  enrollmentId: string;
  studentId: string;
  studentName: string;
  documentId: string;
  studentCode?: string;
  grade: string;
  section: string;
  educationLevel: string;
  dailyStatus: Record<number, AttendanceStatus>;
  dailyNotes: Record<number, string>;
  counts: {
    PRESENT: number;
    ABSENT_JUSTIFIED: number;
    ABSENT_UNJUSTIFIED: number;
    LATE_JUSTIFIED: number;
    LATE_UNJUSTIFIED: number;
  };
  attendanceRate: number;
  riskLevel: 'CRITICAL' | 'WARNING' | 'NORMAL';
  consecutiveAbsences: number;
}

export interface AttendanceMatrixData {
  period: string;
  year: number;
  month: number;
  daysInMonth: number;
  students: AttendanceMatrixStudentRow[];
}

export interface StudentAttendanceDetail {
  enrollmentId: string;
  studentName: string;
  documentId: string;
  studentCode?: string;
  grade: string;
  section: string;
  educationLevel: string;
  period: string;
  counts: {
    PRESENT: number;
    ABSENT_JUSTIFIED: number;
    ABSENT_UNJUSTIFIED: number;
    LATE_JUSTIFIED: number;
    LATE_UNJUSTIFIED: number;
  };
  attendanceRate: number;
  consecutiveAbsences: number;
  riskLevel: 'CRITICAL' | 'WARNING' | 'NORMAL';
  records: Array<{
    id: string;
    date: string;
    status: AttendanceStatus;
    notes?: string;
  }>;
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
   * Busca asistencias paginadas filtrando por schoolId, fecha (opcional) y aula/sección (opcional).
   */
  async findBySchoolAndFilters(
    schoolId: string,
    filters: AttendanceFilterDto,
  ): Promise<PaginatedResult<Attendance>> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    const skip = (page - 1) * limit;

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

    const [data, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        skip,
        take: limit,
        include: ATTENDANCE_INCLUDE,
        orderBy: {
          enrollment: {
            student: {
              lastNamePaternal: 'asc',
            },
          },
        },
      }),
      prisma.attendance.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
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
      date: { gte: startDate, lte: endDate },
      ...(query.classroomId ? { enrollment: { classroomId: query.classroomId } } : {}),
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

    return {
      period,
      totalRecords,
      counts,
      percentages: {
        presentRate: totalRecords > 0 ? Number(((presentTotal / totalRecords) * 100).toFixed(2)) : 0,
        absentRate: totalRecords > 0 ? Number(((absentTotal / totalRecords) * 100).toFixed(2)) : 0,
        lateRate: totalRecords > 0 ? Number(((lateTotal / totalRecords) * 100).toFixed(2)) : 0,
      },
    };
  }

  /**
   * Genera los datos del Acta Mensual de Asistencia agrupados por alumno.
   */
  async getMonthlyExportData(
    schoolId: string,
    query: AttendanceExportQueryDto,
  ): Promise<AttendanceExportRow[]> {
    const [yearStr, monthStr] = query.month.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const records = await prisma.attendance.findMany({
      where: {
        schoolId,
        date: { gte: startDate, lte: endDate },
        ...(query.classroomId ? { enrollment: { classroomId: query.classroomId } } : {}),
      },
      include: {
        enrollment: {
          include: {
            student: { select: { firstNames: true, lastNamePaternal: true, lastNameMaternal: true, documentId: true } },
            classroom: { select: { grade: true, section: true } },
          },
        },
      },
      orderBy: [
        { enrollment: { classroom: { grade: 'asc' } } },
        { enrollment: { student: { lastNamePaternal: 'asc' } } },
      ],
    });

    const studentMap = new Map<string, AttendanceExportRow>();

    for (const record of records) {
      const studentId = record.enrollment?.student
        ? `${record.enrollment.student.documentId}`
        : record.enrollmentId;

      if (!studentMap.has(studentId)) {
        const student = record.enrollment?.student;
        const classroom = record.enrollment?.classroom;
        studentMap.set(studentId, {
          studentName: student
            ? `${student.lastNamePaternal} ${student.lastNameMaternal}, ${student.firstNames}`
            : 'Desconocido',
          documentId: student?.documentId || '',
          grade: classroom ? `${classroom.grade}°` : '',
          section: classroom?.section || '',
          counts: { PRESENT: 0, ABSENT_JUSTIFIED: 0, ABSENT_UNJUSTIFIED: 0, LATE_JUSTIFIED: 0, LATE_UNJUSTIFIED: 0 },
          attendanceRate: 0,
        });
      }

      const row = studentMap.get(studentId)!;
      if (row.counts[record.status] !== undefined) {
        row.counts[record.status]++;
      }
    }

    return Array.from(studentMap.values()).map((row) => {
      const total = Object.values(row.counts).reduce((a, b) => a + b, 0);
      return {
        ...row,
        attendanceRate: total > 0 ? Number(((row.counts.PRESENT / total) * 100).toFixed(1)) : 0,
      };
    });
  }

  /**
   * Obtiene la Matriz Completa de Asistencia del mes (1..31) para toda el aula/sección.
   * Incluye mapa diario por estudiante `{ [dia]: status }` y cálculo de semáforo de riesgo por inasistencia.
   */
  async getMonthlyMatrixData(
    schoolId: string,
    query: AttendanceMatrixQueryDto,
  ): Promise<AttendanceMatrixData> {
    const [yearStr, monthStr] = query.month.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);
    const daysInMonth = new Date(year, month, 0).getDate();

    // 1. Obtener todas las matrículas activas de la sección (o colegio)
    const enrollments = await prisma.enrollment.findMany({
      where: {
        schoolId,
        ...(query.classroomId ? { classroomId: query.classroomId } : {}),
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
        classroom: {
          select: {
            id: true,
            grade: true,
            section: true,
            educationLevel: true,
          },
        },
      },
      orderBy: [
        { classroom: { grade: 'asc' } },
        { classroom: { section: 'asc' } },
        { student: { lastNamePaternal: 'asc' } },
      ],
    });

    // 2. Obtener los registros de asistencia en el rango de fechas
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        schoolId,
        date: { gte: startDate, lte: endDate },
        ...(query.classroomId ? { enrollment: { classroomId: query.classroomId } } : {}),
      },
      select: {
        id: true,
        enrollmentId: true,
        date: true,
        status: true,
        notes: true,
      },
      orderBy: { date: 'asc' },
    });

    // Agrupar asistencias por enrollmentId -> dayNumber
    const attendanceByEnrollment = new Map<
      string,
      Map<number, { status: AttendanceStatus; notes?: string }>
    >();

    for (const record of attendanceRecords) {
      const recordDay = new Date(record.date).getUTCDate();
      if (!attendanceByEnrollment.has(record.enrollmentId)) {
        attendanceByEnrollment.set(record.enrollmentId, new Map());
      }
      attendanceByEnrollment.get(record.enrollmentId)!.set(recordDay, {
        status: record.status,
        notes: record.notes || undefined,
      });
    }

    // 3. Construir la estructura de cada estudiante
    const studentRows: AttendanceMatrixStudentRow[] = enrollments.map((e) => {
      const studentMap = attendanceByEnrollment.get(e.id) || new Map();
      const dailyStatus: Record<number, AttendanceStatus> = {};
      const dailyNotes: Record<number, string> = {};
      const counts = {
        PRESENT: 0,
        ABSENT_JUSTIFIED: 0,
        ABSENT_UNJUSTIFIED: 0,
        LATE_JUSTIFIED: 0,
        LATE_UNJUSTIFIED: 0,
      };

      for (let d = 1; d <= daysInMonth; d++) {
        const item = studentMap.get(d);
        if (item) {
          dailyStatus[d] = item.status;
          if (item.notes) dailyNotes[d] = item.notes;
          if (counts[item.status as keyof typeof counts] !== undefined) {
            counts[item.status as keyof typeof counts]++;
          }
        }
      }

      const totalRecorded = Object.keys(dailyStatus).length;
      const attendanceRate =
        totalRecorded > 0
          ? Number(((counts.PRESENT / totalRecorded) * 100).toFixed(1))
          : 100;

      // Calcular faltas injustificadas consecutivas
      let consecutiveAbsences = 0;
      let currentStreak = 0;
      for (let d = 1; d <= daysInMonth; d++) {
        if (dailyStatus[d] === 'ABSENT_UNJUSTIFIED') {
          currentStreak++;
          if (currentStreak > consecutiveAbsences) {
            consecutiveAbsences = currentStreak;
          }
        } else if (dailyStatus[d]) {
          currentStreak = 0;
        }
      }

      // Evaluar nivel de riesgo (Semáforo de Asistencia MINEDU)
      let riskLevel: 'CRITICAL' | 'WARNING' | 'NORMAL' = 'NORMAL';
      if (counts.ABSENT_UNJUSTIFIED >= 3 || consecutiveAbsences >= 3 || (totalRecorded > 5 && attendanceRate < 80)) {
        riskLevel = 'CRITICAL';
      } else if (counts.ABSENT_UNJUSTIFIED >= 1 || counts.ABSENT_JUSTIFIED >= 3 || (totalRecorded > 5 && attendanceRate < 90)) {
        riskLevel = 'WARNING';
      }

      const student = e.student;
      const classroom = e.classroom;

      return {
        enrollmentId: e.id,
        studentId: student?.id || '',
        studentName: student
          ? `${student.lastNamePaternal} ${student.lastNameMaternal}, ${student.firstNames}`
          : 'Desconocido',
        documentId: student?.documentId || '',
        studentCode: student?.studentCode || undefined,
        grade: classroom ? `${classroom.grade}°` : '',
        section: classroom?.section || '',
        educationLevel: classroom?.educationLevel || '',
        dailyStatus,
        dailyNotes,
        counts,
        attendanceRate,
        riskLevel,
        consecutiveAbsences,
      };
    });

    return {
      period: query.month,
      year,
      month,
      daysInMonth,
      students: studentRows,
    };
  }

  /**
   * Obtiene el expediente individual completo de asistencia de un estudiante para el mes.
   */
  async getStudentMonthlyDetail(
    schoolId: string,
    enrollmentId: string,
    query: StudentAttendanceQueryDto,
  ): Promise<StudentAttendanceDetail> {
    const now = new Date();
    const period = query.month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const [yearStr, monthStr] = period.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const enrollment = await prisma.enrollment.findFirst({
      where: { id: enrollmentId, schoolId },
      include: {
        student: true,
        classroom: true,
      },
    });

    if (!enrollment) {
      throw new Error(`Matrícula con id ${enrollmentId} no encontrada`);
    }

    const records = await prisma.attendance.findMany({
      where: {
        schoolId,
        enrollmentId,
        date: { gte: startDate, lte: endDate },
      },
      orderBy: { date: 'asc' },
    });

    const counts = {
      PRESENT: 0,
      ABSENT_JUSTIFIED: 0,
      ABSENT_UNJUSTIFIED: 0,
      LATE_JUSTIFIED: 0,
      LATE_UNJUSTIFIED: 0,
    };

    let consecutiveAbsences = 0;
    let currentStreak = 0;

    const formattedRecords = records.map((r) => {
      if (counts[r.status as keyof typeof counts] !== undefined) {
        counts[r.status as keyof typeof counts]++;
      }

      if (r.status === 'ABSENT_UNJUSTIFIED') {
        currentStreak++;
        if (currentStreak > consecutiveAbsences) {
          consecutiveAbsences = currentStreak;
        }
      } else {
        currentStreak = 0;
      }

      return {
        id: r.id,
        date: r.date.toISOString().split('T')[0],
        status: r.status,
        notes: r.notes || undefined,
      };
    });

    const totalRecords = records.length;
    const attendanceRate =
      totalRecords > 0
        ? Number(((counts.PRESENT / totalRecords) * 100).toFixed(1))
        : 100;

    let riskLevel: 'CRITICAL' | 'WARNING' | 'NORMAL' = 'NORMAL';
    if (counts.ABSENT_UNJUSTIFIED >= 3 || consecutiveAbsences >= 3 || (totalRecords > 5 && attendanceRate < 80)) {
      riskLevel = 'CRITICAL';
    } else if (counts.ABSENT_UNJUSTIFIED >= 1 || counts.ABSENT_JUSTIFIED >= 3 || (totalRecords > 5 && attendanceRate < 90)) {
      riskLevel = 'WARNING';
    }

    const student = enrollment.student;
    const classroom = enrollment.classroom;

    return {
      enrollmentId: enrollment.id,
      studentName: student
        ? `${student.lastNamePaternal} ${student.lastNameMaternal}, ${student.firstNames}`
        : 'Estudiante',
      documentId: student?.documentId || '',
      studentCode: student?.studentCode || undefined,
      grade: classroom ? `${classroom.grade}°` : '',
      section: classroom?.section || '',
      educationLevel: classroom?.educationLevel || '',
      period,
      counts,
      attendanceRate,
      consecutiveAbsences,
      riskLevel,
      records: formattedRecords,
    };
  }
}
