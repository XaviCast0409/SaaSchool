import { AppError } from '../../core/errors/app-error';
import type {
  AttendanceRepository,
  AttendanceMonthlySummary,
  AttendanceExportRow,
  AttendanceMatrixData,
  StudentAttendanceDetail,
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
} from './attendance.schema';
import type { PaginatedResult } from '../../core/interfaces/global.interfaces';
import type { Attendance } from '@prisma/client';

export class AttendanceService {
  constructor(private readonly attendanceRepository: AttendanceRepository) {}

  async getAttendanceByFilters(
    schoolId: string,
    filters: AttendanceFilterDto,
  ): Promise<PaginatedResult<Attendance>> {
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
}
