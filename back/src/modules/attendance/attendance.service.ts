import { prisma } from '../../config/prisma';
import { AppError } from '../../core/errors/app-error';
import type {
  AttendanceRepository,
  AttendanceMonthlySummary,
  AttendanceExportRow,
  AttendanceMatrixData,
  StudentAttendanceDetail,
  AttendancePaginatedWithStats,
} from './attendance.repository';
import type {
  AttendanceFilterDto,
  AttendanceSummaryQueryDto,
  AttendanceExportQueryDto,
  AttendanceMatrixQueryDto,
  StudentAttendanceQueryDto,
  BulkAttendanceDto,
  CreateAttendanceDto,
  UpdateAttendanceDto,
  ScanAttendanceDto,
} from './attendance.schema';
import type { Attendance, AttendanceStatus } from '@prisma/client';

export interface AttendanceUserContext {
  userId: string;
  role: string;
  schoolId: string;
}

export class AttendanceService {
  constructor(private readonly attendanceRepository: AttendanceRepository) {}

  /**
   * Valida si el usuario tiene permiso para REGISTRAR o MODIFICAR la asistencia del estudiante:
   * - SCHOOL_ADMIN / ADMINISTRATIVE: Acceso total de gestión a todas las aulas (incluso sin tutor).
   * - TEACHER: Solo permitido si es el tutor asignado a esa sección específica.
   */
  private async verifyTutorOrAdminEnrollmentWriteAccess(
    schoolId: string,
    enrollmentId: string,
    userContext?: AttendanceUserContext,
  ): Promise<void> {
    if (
      !userContext ||
      userContext.role === 'SUPER_ADMIN' ||
      userContext.role === 'SCHOOL_ADMIN' ||
      userContext.role === 'ADMINISTRATIVE'
    ) {
      return;
    }

    if (userContext.role === 'TEACHER') {
      const enrollment = await prisma.enrollment.findFirst({
        where: { id: enrollmentId, schoolId },
        select: {
          classroom: {
            select: { id: true, tutorTeacherId: true },
          },
        },
      });

      if (!enrollment || !enrollment.classroom) {
        throw new AppError('Matrícula o aula no encontrada', 404);
      }

      if (enrollment.classroom.tutorTeacherId !== userContext.userId) {
        throw new AppError(
          'Acceso denegado: Solo el tutor asignado o personal administrativo puede registrar o modificar la asistencia de este estudiante.',
          403,
        );
      }
    }
  }

  async getAttendanceByFilters(
    schoolId: string,
    filters: AttendanceFilterDto,
    userContext?: AttendanceUserContext,
  ): Promise<AttendancePaginatedWithStats> {
    // Si es docente y no seleccionó aula específica, intentar preseleccionar su aula tutoriada
    if (userContext?.role === 'TEACHER' && !filters.classroomId) {
      const tutoredClassrooms = await prisma.classroom.findMany({
        where: { schoolId, tutorTeacherId: userContext.userId },
        select: { id: true },
      });

      if (tutoredClassrooms.length > 0) {
        filters = { ...filters, classroomId: tutoredClassrooms[0].id };
      }
    }

    return this.attendanceRepository.findBySchoolAndFilters(schoolId, filters);
  }

  async getAttendanceByEnrollment(
    enrollmentId: string,
    schoolId: string,
  ): Promise<Attendance[]> {
    return this.attendanceRepository.findByEnrollment(enrollmentId, schoolId);
  }

  async registerAttendance(
    schoolId: string,
    createAttendanceDto: CreateAttendanceDto,
    userContext?: AttendanceUserContext,
  ): Promise<Attendance> {
    await this.verifyTutorOrAdminEnrollmentWriteAccess(
      schoolId,
      createAttendanceDto.enrollmentId,
      userContext,
    );
    return this.attendanceRepository.create(schoolId, createAttendanceDto);
  }

  async registerBulkAttendance(
    schoolId: string,
    bulkAttendanceDto: BulkAttendanceDto,
    userContext?: AttendanceUserContext,
  ): Promise<{ count: number }> {
    if (bulkAttendanceDto.records.length > 0) {
      await this.verifyTutorOrAdminEnrollmentWriteAccess(
        schoolId,
        bulkAttendanceDto.records[0].enrollmentId,
        userContext,
      );
    }
    return this.attendanceRepository.bulkCreate(schoolId, bulkAttendanceDto);
  }

  async updateAttendance(
    attendanceId: string,
    schoolId: string,
    updateData: UpdateAttendanceDto,
    userContext?: AttendanceUserContext,
  ): Promise<Attendance> {
    const existing = await this.attendanceRepository.findById(attendanceId, schoolId);

    if (!existing) {
      throw new AppError(`Registro de asistencia con id ${attendanceId} no encontrado`, 404);
    }

    if (userContext?.role === 'TEACHER') {
      const tutoredTeacherId = (existing as any).enrollment?.classroom?.tutorTeacherId;
      if (tutoredTeacherId !== userContext.userId) {
        throw new AppError(
          'Acceso denegado: Solo el tutor asignado al aula o personal administrativo puede modificar esta asistencia.',
          403,
        );
      }
    }

    return this.attendanceRepository.update(attendanceId, schoolId, updateData);
  }

  async getMonthlySummary(
    schoolId: string,
    query: AttendanceSummaryQueryDto,
  ): Promise<AttendanceMonthlySummary> {
    return this.attendanceRepository.getMonthlySummary(schoolId, query);
  }

  async getMonthlyExportData(
    schoolId: string,
    query: AttendanceExportQueryDto,
  ): Promise<AttendanceExportRow[]> {
    return this.attendanceRepository.getMonthlyExportData(schoolId, query);
  }

  async getMonthlyMatrixData(
    schoolId: string,
    query: AttendanceMatrixQueryDto,
    _userContext?: AttendanceUserContext,
  ): Promise<AttendanceMatrixData> {
    return this.attendanceRepository.getMonthlyMatrixData(schoolId, query);
  }

  async getStudentMonthlyDetail(
    schoolId: string,
    enrollmentId: string,
    query: StudentAttendanceQueryDto,
  ): Promise<StudentAttendanceDetail> {
    try {
      return await this.attendanceRepository.getStudentMonthlyDetail(
        schoolId,
        enrollmentId,
        query,
      );
    } catch (err: any) {
      throw new AppError(err.message || 'Error al obtener expediente de estudiante', 404);
    }
  }

  async scanAttendance(
    schoolId: string,
    dto: ScanAttendanceDto,
    userContext?: AttendanceUserContext,
  ) {
    const enrollment = await this.attendanceRepository.findActiveEnrollmentByCode(
      schoolId,
      dto.code,
    );

    if (!enrollment) {
      throw new AppError(
        `No se encontró ningún estudiante con matrícula activa para el código/DNI: ${dto.code}`,
        404,
      );
    }

    if (userContext?.role === 'TEACHER') {
      if (enrollment.classroom?.tutorTeacherId !== userContext.userId) {
        throw new AppError(
          'Acceso denegado: Solo el tutor de aula asignado o personal administrativo puede registrar la asistencia de este estudiante.',
          403,
        );
      }
    }

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const todayDate = new Date(todayStr);

    const existing = await this.attendanceRepository.findAttendanceByDate(
      schoolId,
      enrollment.id,
      todayDate,
    );

    const studentFullName = `${enrollment.student.firstNames} ${enrollment.student.lastNamePaternal} ${enrollment.student.lastNameMaternal || ''}`.trim();
    const classroomName = `${enrollment.classroom.grade}° "${enrollment.classroom.section}" - ${enrollment.classroom.educationLevel}`;

    if (existing) {
      const checkInFormatted = existing.checkInTime
        ? new Date(existing.checkInTime).toLocaleTimeString('es-PE', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        : 'Hora no registrada';

      return {
        alreadyRegistered: true,
        message: `El estudiante ya tiene asistencia registrada para hoy (${existing.status}) a las ${checkInFormatted}`,
        attendance: existing,
        student: {
          id: enrollment.student.id,
          fullName: studentFullName,
          documentId: enrollment.student.documentId,
          studentCode: enrollment.student.studentCode,
          classroom: classroomName,
        },
        status: existing.status,
        checkInTime: existing.checkInTime,
      };
    }

    let finalStatus: AttendanceStatus = dto.statusOverride || 'PRESENT';

    if (!dto.statusOverride && dto.toleranceTime) {
      const [tolHour, tolMin] = dto.toleranceTime.split(':').map(Number);
      const currentHour = now.getHours();
      const currentMin = now.getMinutes();

      if (currentHour > tolHour || (currentHour === tolHour && currentMin > tolMin)) {
        finalStatus = 'LATE_UNJUSTIFIED';
      }
    }

    const attendance = await this.attendanceRepository.recordScanAttendance({
      schoolId,
      enrollmentId: enrollment.id,
      date: todayDate,
      status: finalStatus,
      checkInTime: now,
      origin: 'QR_SCAN',
      notes: `Ingreso escaneado vía QR/Kiosco a las ${now.toLocaleTimeString('es-PE')}`,
    });

    return {
      alreadyRegistered: false,
      message:
        finalStatus === 'PRESENT'
          ? `¡Ingreso puntual registrado con éxito!`
          : `Ingreso registrado con Tardanza.`,
      attendance,
      student: {
        id: enrollment.student.id,
        fullName: studentFullName,
        documentId: enrollment.student.documentId,
        studentCode: enrollment.student.studentCode,
        classroom: classroomName,
      },
      status: finalStatus,
      checkInTime: now,
    };
  }
}
