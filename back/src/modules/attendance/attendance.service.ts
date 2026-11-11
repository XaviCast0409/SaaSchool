import { prisma } from '../../config/prisma';
import { AppError } from '../../core/errors/app-error';
import { getSchoolNow, getSchoolTimeParts, parseSchoolDate } from '../../utils/timezone.util';
import { sendWebPushNotification } from '../../utils/web-push.util';
import { notificationService } from '../notifications/notification.routes';
import { levelsForScope, type ScheduleScope } from './attendance.rules';
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

    let instant = new Date();
    if (dto.scannedAt) {
      const scanned = new Date(dto.scannedAt);
      const diffMs = Date.now() - scanned.getTime();
      if (diffMs < -2 * 60_000) throw new AppError('La hora del escaneo está en el futuro. Revisa la hora del dispositivo.', 422);
      if (diffMs > 12 * 60 * 60_000) throw new AppError('El escaneo tiene más de 12 horas y no puede registrarse automáticamente.', 422);
      instant = scanned;
    }
    const schoolNow = getSchoolTimeParts(instant);
    const todayDate = schoolNow.dateObj;
    const now = schoolNow.fullDate;

    const existing = await this.attendanceRepository.findAttendanceByDate(
      schoolId,
      enrollment.id,
      todayDate,
    );

    const studentFullName = `${enrollment.student.firstNames} ${enrollment.student.lastNamePaternal} ${enrollment.student.lastNameMaternal || ''}`.trim();
    const classroomName = `${enrollment.classroom.grade}° "${enrollment.classroom.section}" - ${enrollment.classroom.educationLevel}`;

    const isAutoCloseAbsence = existing?.origin === 'AUTO_CLOSE' && existing.status === 'ABSENT_UNJUSTIFIED';
    if (existing && !isAutoCloseAbsence) {
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
    if (isAutoCloseAbsence) {
      noteText += ' (Corrige la falta asignada por el cierre automático)';
    }
    if (dto.scannedAt) {
      noteText += ' [sincronizado sin conexión]';
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

    void this.sendScanPushNotification(enrollment, attendance).catch((err) =>
      console.error('[AttendanceScanPushError]:', err),
    );

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

    const holiday = await prisma.schoolHoliday.findUnique({
      where: { schoolId_date: { schoolId, date: parseSchoolDate(dateStr) } },
    });
    if (holiday) {
      throw new AppError(
        `La fecha ${dateStr} está registrada como feriado (${holiday.name}). No se puede cerrar la asistencia.`,
        400,
      );
    }

    const result = await this.attendanceRepository.closeAttendance({
      schoolId,
      classroomId: dto.classroomId,
      educationLevels: dto.educationLevel ? [dto.educationLevel] : undefined,
      dateStr,
    });

    if (result.createdAttendanceIds.length > 0) {
      void this.notifyAbsences(schoolId, result.createdAttendanceIds).catch((e) => console.error('[AbsenceNotify]', e));
    }

    return {
      closedCount: result.closedCount,
      totalUnrecorded: result.totalUnrecorded,
      message:
        result.closedCount > 0
          ? `Cierre completado: Se asignó Falta Injustificada a ${result.closedCount} alumno(s) sin marcación.`
          : 'Todos los alumnos contaban con asistencia registrada para la fecha.',
    };
  }

  /** Notifica a los apoderados de cada alumno con falta automática (push + campana). */
  private async notifyAbsences(schoolId: string, attendanceIds: string[]): Promise<void> {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { notifyAbsencesToFamilies: true },
    });
    if (!school?.notifyAbsencesToFamilies) return;

    const attendances = await prisma.attendance.findMany({
      where: { id: { in: attendanceIds }, schoolId },
      select: {
        date: true,
        enrollmentId: true,
        enrollment: {
          select: {
            student: {
              select: {
                firstNames: true,
                lastNamePaternal: true,
                familyRelations: { select: { userId: true } },
              },
            },
          },
        },
      },
    });

    for (const attendance of attendances) {
      const student = attendance.enrollment.student;
      const dateStr = attendance.date.toISOString().slice(0, 10);
      const [y, m, d] = dateStr.split('-');
      const userIds = Array.from(new Set(student.familyRelations.map((r) => r.userId)));
      for (const userId of userIds) {
        await notificationService
          .createNotification(schoolId, {
            userId,
            title: 'Inasistencia registrada',
            message: `${student.firstNames} ${student.lastNamePaternal} no registró su ingreso hoy (${d}/${m}/${y}). Si es un error o tiene justificación, toca aquí para enviarla.`,
            type: 'ATTENDANCE',
            link: `/attendance?justify=${attendance.enrollmentId}&date=${dateStr}`,
          })
          .catch((error) => console.error('[AbsenceNotify] Error al notificar', userId, error));
      }
    }
  }

  /** Cierre automático de un horario: solo los niveles que gobierna ese horario. */
  async closeAttendanceForScope(schoolId: string, scope: ScheduleScope, dateStr: string): Promise<number> {
    const [school, configs] = await Promise.all([
      prisma.school.findUnique({ where: { id: schoolId }, select: { offeredLevels: true } }),
      prisma.attendanceScheduleConfig.findMany({ where: { schoolId }, select: { scope: true } }),
    ]);
    const levels = levelsForScope(scope, school?.offeredLevels ?? [], configs.map((c) => c.scope as ScheduleScope));
    if (levels.length === 0) return 0;

    const result = await this.attendanceRepository.closeAttendance({ schoolId, educationLevels: levels, dateStr });
    if (result.createdAttendanceIds.length > 0) {
      void this.notifyAbsences(schoolId, result.createdAttendanceIds).catch((e) => console.error('[AbsenceNotify]', e));
    }
    return result.closedCount;
  }

  async evaluateRiskForSchoolOncePerDay(_schoolId: string, _dateStr: string): Promise<void> {}

  /** Padrón minimizado para escaneo y reconocimiento sin conexión */
  async getScanRoster(schoolId: string, userContext?: AttendanceUserContext) {
    const activeYear = await prisma.academicYear.findFirst({
      where: { schoolId, isActive: true },
      select: { id: true },
    });
    if (!activeYear) return [];

    let classroomIds: string[] | undefined;
    if (userContext?.role === 'TEACHER') {
      const tutored = await prisma.classroom.findMany({
        where: { schoolId, tutorTeacherId: userContext.userId },
        select: { id: true },
      });
      classroomIds = tutored.map((c) => c.id);
      if (classroomIds.length === 0) return [];
    }

    const enrollments = await prisma.enrollment.findMany({
      where: {
        schoolId,
        academicYearId: activeYear.id,
        isActive: true,
        ...(classroomIds && { classroomId: { in: classroomIds } }),
      },
      select: {
        student: {
          select: {
            studentCode: true,
            documentId: true,
            firstNames: true,
            lastNamePaternal: true,
            lastNameMaternal: true,
          },
        },
        classroom: {
          select: {
            grade: true,
            section: true,
            educationLevel: true,
          },
        },
      },
    });

    return enrollments.map((e) => {
      const s = e.student;
      const fullName = `${s.firstNames} ${s.lastNamePaternal} ${s.lastNameMaternal || ''}`.trim();
      const classroom = `${e.classroom.grade}° "${e.classroom.section}" - ${e.classroom.educationLevel}`;
      return {
        studentCode: s.studentCode ?? null,
        documentId: s.documentId,
        fullName,
        classroom,
      };
    });
  }

  /**
   * Notificación asíncrona Web Push al apoderado tras escaneo de carnet (Fire-and-Forget).
   */
  private async sendScanPushNotification(enrollment: any, attendance: any): Promise<void> {
    try {
      const studentId = enrollment.student?.id;
      if (!studentId) return;

      const studentWithFamily = await prisma.student.findUnique({
        where: { id: studentId },
        select: {
          firstNames: true,
          lastNamePaternal: true,
          familyRelations: {
            select: {
              userId: true,
            },
          },
        },
      });

      const parentUserIds = (studentWithFamily?.familyRelations || [])
        .map((p) => p.userId)
        .filter((id): id is string => Boolean(id));

      if (parentUserIds.length === 0) return;

      const subscriptions = await prisma.pushSubscription.findMany({
        where: {
          schoolId: attendance.schoolId,
          userId: { in: parentUserIds },
        },
      });

      if (subscriptions.length === 0) return;

      const studentName = `${enrollment.student.firstNames} ${enrollment.student.lastNamePaternal}`;
      const statusLabel = attendance.status === 'PRESENT' ? 'Puntual' : 'Tardanza';
      const timeStr = attendance.checkInTime
        ? new Date(attendance.checkInTime).toLocaleTimeString('es-PE', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'America/Lima',
          })
        : '';

      const payload = {
        title: `Ingreso al Colegio: ${statusLabel}`,
        message: `${studentName} registró su ingreso a las ${timeStr}.`,
        link: '/attendance',
      };

      await Promise.allSettled(
        subscriptions.map(async (sub) => {
          const res = await sendWebPushNotification(
            { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
            payload,
          );
          if (res.shouldRemove) {
            await prisma.pushSubscription.deleteMany({ where: { endpoint: sub.endpoint } });
          }
        }),
      );
    } catch (err) {
      console.error('[AttendanceScanPushError]:', err);
    }
  }
}
