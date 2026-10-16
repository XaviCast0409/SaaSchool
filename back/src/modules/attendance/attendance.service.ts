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

export class AttendanceService {
  constructor(private readonly attendanceRepository: AttendanceRepository) {}

  async getAttendanceByFilters(
    schoolId: string,
    filters: AttendanceFilterDto,
  ): Promise<AttendancePaginatedWithStats> {
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
  ): Promise<Attendance> {
    return this.attendanceRepository.create(schoolId, createAttendanceDto);
  }

  async registerBulkAttendance(
    schoolId: string,
    bulkAttendanceDto: BulkAttendanceDto,
  ): Promise<{ count: number }> {
    return this.attendanceRepository.bulkCreate(schoolId, bulkAttendanceDto);
  }

  async updateAttendance(
    attendanceId: string,
    schoolId: string,
    updateData: UpdateAttendanceDto,
  ): Promise<Attendance> {
    const existing = await this.attendanceRepository.findById(attendanceId, schoolId);

    if (!existing) {
      throw new AppError(`Registro de asistencia con id ${attendanceId} no encontrado`, 404);
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

  async scanAttendance(schoolId: string, dto: ScanAttendanceDto) {
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
