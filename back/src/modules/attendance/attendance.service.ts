import { prisma } from '../../config/prisma';
import { AppError } from '../../core/errors/app-error';
import { getSchoolNow } from '../../utils/timezone.util';
import type {
  AttendanceRepository,
  AttendanceMonthlySummary,
  AttendanceExportRow,
  AttendanceMatrixData,
  StudentAttendanceDetail,
  AttendancePaginatedWithStats,
  AttendanceSheetData,
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
  AttendanceSheetQueryDto,
  SaveAttendanceSheetDto,
  UpsertAttendanceScheduleConfigDto,
  CloseClassroomAttendanceDto,
} from './attendance.schema';
import type { Attendance, AttendanceStatus, AttendanceScheduleConfig } from '@prisma/client';

export interface AttendanceUserContext {
  userId: string;
  role: string;
  schoolId: string;
}

export class AttendanceService {
  constructor(private readonly attendanceRepository: AttendanceRepository) {}

  /**
   * Valida si el usuario tiene permiso para REGISTRAR o MODIFICAR la asistencia de un aula específica:
   * - SUPER_ADMIN / SCHOOL_ADMIN / ADMINISTRATIVE: Acceso total de gestión.
   * - TEACHER: Solo permitido si es el tutor asignado al aula.
   */
  private async verifyTutorOrAdminClassroomWriteAccess(
    schoolId: string,
    classroomId: string,
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
      const classroom = await prisma.classroom.findFirst({
        where: { id: classroomId, schoolId },
        select: { id: true, tutorTeacherId: true },
      });

      if (!classroom) {
        throw new AppError('Aula no encontrada', 404);
      }

      if (classroom.tutorTeacherId !== userContext.userId) {
        throw new AppError(
          'Acceso denegado: Solo el tutor asignado o personal administrativo puede registrar o modificar la asistencia de este aula.',
          403,
        );
      }
    }
  }

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
    if (userContext?.role === 'TEACHER' && bulkAttendanceDto.records.length > 0) {
      const enrollmentIds = bulkAttendanceDto.records.map((r) => r.enrollmentId);
      const invalidCount = await prisma.enrollment.count({
        where: {
          id: { in: enrollmentIds },
          schoolId,
          classroom: {
            tutorTeacherId: { not: userContext.userId },
          },
        },
      });

      if (invalidCount > 0) {
        throw new AppError(
          'Acceso denegado: Uno o más estudiantes no pertenecen a su aula tutoriada.',
          403,
        );
      }
    }
    return this.attendanceRepository.bulkCreate(schoolId, bulkAttendanceDto);
  }

  /**
   * Obtiene la nómina completa del aula cruzada con el estado de asistencia de la fecha.
   */
  async getAttendanceSheet(
    schoolId: string,
    query: AttendanceSheetQueryDto,
    _userContext?: AttendanceUserContext,
  ): Promise<AttendanceSheetData> {
    return this.attendanceRepository.getClassroomAttendanceSheet(
      schoolId,
      query.classroomId,
      query.date,
    );
  }

  /**
   * Guarda o actualiza la hoja de asistencia de una sección de forma atómica y segura.
   */
  async saveAttendanceSheet(
    schoolId: string,
    dto: SaveAttendanceSheetDto,
    userContext?: AttendanceUserContext,
  ): Promise<{ count: number }> {
    await this.verifyTutorOrAdminClassroomWriteAccess(schoolId, dto.classroomId, userContext);

    // Validar que todas las matrículas pertenezcan al aula y al colegio
    const enrollmentIds = dto.records.map((r) => r.enrollmentId);
    if (enrollmentIds.length > 0) {
      const validEnrollments = await prisma.enrollment.count({
        where: {
          id: { in: enrollmentIds },
          classroomId: dto.classroomId,
          schoolId,
        },
      });

      if (validEnrollments !== enrollmentIds.length) {
        throw new AppError(
          'Una o más matrículas no pertenecen a esta sección o colegio.',
          400,
        );
      }
    }

    return this.attendanceRepository.saveClassroomAttendanceSheet(schoolId, dto);
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

    const schoolNow = getSchoolNow();
    const todayDate = schoolNow.dateObj;
    const now = schoolNow.fullDate;

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
            timeZone: 'America/Lima',
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

    const schedule = await this.attendanceRepository.getScheduleConfigForLevel(
      schoolId,
      enrollment.classroom?.educationLevel,
    );

    const effectiveTolerance = dto.toleranceTime || schedule.entryTime;
    const [tolHour, tolMin] = effectiveTolerance.split(':').map(Number);
    const [lateLimitHour, lateLimitMin] = schedule.lateToleranceTime.split(':').map(Number);

    const currentHour = schoolNow.hour;
    const currentMin = schoolNow.minute;
    const currentTotalMin = currentHour * 60 + currentMin;
    const tolTotalMin = tolHour * 60 + tolMin;
    const lateLimitTotalMin = lateLimitHour * 60 + lateLimitMin;

    let finalStatus: AttendanceStatus = dto.statusOverride || 'PRESENT';

    if (!dto.statusOverride) {
      if (currentTotalMin > tolTotalMin) {
        finalStatus = 'LATE_UNJUSTIFIED';
      } else {
        finalStatus = 'PRESENT';
      }
    }

    let noteText = `Ingreso escaneado vía QR/Kiosco a las ${now.toLocaleTimeString('es-PE', { timeZone: 'America/Lima' })}`;
    if (currentTotalMin > lateLimitTotalMin) {
      noteText += ` (Llegada posterior al límite de tolerancia de las ${schedule.lateToleranceTime})`;
    }

    const attendance = await this.attendanceRepository.recordScanAttendance({
      schoolId,
      enrollmentId: enrollment.id,
      date: todayDate,
      status: finalStatus,
      checkInTime: now,
      origin: 'QR_SCAN',
      notes: noteText,
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

  /**
   * Obtiene la configuración de horarios de asistencia del colegio.
   */
  async getScheduleConfigs(schoolId: string): Promise<AttendanceScheduleConfig[]> {
    return this.attendanceRepository.getScheduleConfigs(schoolId);
  }

  /**
   * Guarda o actualiza los horarios de asistencia (Puntualidad, Tardanza, Corte).
   */
  async upsertScheduleConfig(
    schoolId: string,
    data: UpsertAttendanceScheduleConfigDto
  ): Promise<AttendanceScheduleConfig> {
    return this.attendanceRepository.upsertScheduleConfig(schoolId, data);
  }

  /**
   * Cierre diario de asistencia (Manual o Automático):
   * Asigna Falta Injustificada a los alumnos activos que no registraron ingreso.
   */
  async closeAttendance(
    schoolId: string,
    dto: CloseClassroomAttendanceDto,
    userContext?: AttendanceUserContext
  ): Promise<{ closedCount: number; totalUnrecorded: number; message: string }> {
    if (dto.classroomId) {
      await this.verifyTutorOrAdminClassroomWriteAccess(schoolId, dto.classroomId, userContext);
    } else {
      if (
        userContext &&
        userContext.role !== 'SUPER_ADMIN' &&
        userContext.role !== 'SCHOOL_ADMIN' &&
        userContext.role !== 'ADMINISTRATIVE'
      ) {
        throw new AppError(
          'Acceso denegado: Solo directivos o administradores pueden ejecutar el cierre general del colegio.',
          403
        );
      }
    }

    const dateStr = dto.date || getSchoolNow().dateStr;
    const result = await this.attendanceRepository.closeAttendance({
      schoolId,
      classroomId: dto.classroomId,
      dateStr,
    });

    return {
      ...result,
      message:
        result.closedCount > 0
          ? `Cierre completado: Se asignó Falta Injustificada a ${result.closedCount} alumno(s) sin marcación.`
          : 'Todos los alumnos contaban con asistencia registrada para la fecha.',
    };
  }
}
