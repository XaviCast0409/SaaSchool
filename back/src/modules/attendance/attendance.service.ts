import { AppError } from '../../core/errors/app-error';
import type { AttendanceRepository, AttendanceMonthlySummary } from './attendance.repository';
import type {
  AttendanceFilterDto,
  AttendanceSummaryQueryDto,
  BulkAttendanceDto,
  CreateAttendanceDto,
  UpdateAttendanceDto,
} from './attendance.schema';
import type { Attendance } from '@prisma/client';

export class AttendanceService {
  constructor(private readonly attendanceRepository: AttendanceRepository) {}

  async getAttendanceByFilters(
    schoolId: string,
    filters: AttendanceFilterDto,
  ): Promise<Attendance[]> {
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
}
