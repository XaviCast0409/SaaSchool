import { prisma } from '../../config/prisma';
import type { Attendance } from '@prisma/client';
import type { BulkAttendanceDto, CreateAttendanceDto } from './attendance.schema';

export class AttendanceRepository {
  async findBySchoolAndDate(schoolId: string, date: string): Promise<Attendance[]> {
    return prisma.attendance.findMany({
      where: {
        schoolId,
        date: new Date(date),
      },
      include: { enrollment: { include: { student: true } } },
    });
  }

  async findByEnrollment(enrollmentId: string, schoolId: string): Promise<Attendance[]> {
    return prisma.attendance.findMany({
      where: { enrollmentId, schoolId },
      orderBy: { date: 'desc' },
    });
  }

  async create(schoolId: string, data: CreateAttendanceDto): Promise<Attendance> {
    return prisma.attendance.create({
      data: {
        ...data,
        schoolId,
        date: new Date(data.date),
      },
    });
  }

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

  async update(
    attendanceId: string,
    schoolId: string,
    data: Partial<CreateAttendanceDto>,
  ): Promise<Attendance> {
    return prisma.attendance.update({
      where: { id: attendanceId, schoolId },
      data: {
        ...data,
        date: data.date ? new Date(data.date) : undefined,
      },
    });
  }
}
