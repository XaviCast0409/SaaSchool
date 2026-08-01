import type { AttendanceRepository } from './attendance.repository';
import type { BulkAttendanceDto, CreateAttendanceDto } from './attendance.schema';
import type { Attendance } from '@prisma/client';

export class AttendanceService {
  constructor(private readonly attendanceRepository: AttendanceRepository) {}

  async getAttendanceByDate(schoolId: string, date: string): Promise<Attendance[]> {
    return this.attendanceRepository.findBySchoolAndDate(schoolId, date);
  }

  async getAttendanceByEnrollment(enrollmentId: string, schoolId: string): Promise<Attendance[]> {
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
    updateData: Partial<CreateAttendanceDto>,
  ): Promise<Attendance> {
    return this.attendanceRepository.update(attendanceId, schoolId, updateData);
  }
}
