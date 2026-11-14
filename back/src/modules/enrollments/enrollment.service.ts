import { AppError } from '../../core/errors/app-error';
import { prisma } from '../../config/prisma';
import { feeScheduleService, type ScheduleResult } from '../payments/fee-schedule.service';
import type { EnrollmentRepository } from './enrollment.repository';
import type { CreateEnrollmentDto, UpdateEnrollmentDto } from './enrollment.schema';
import type { Enrollment } from '@prisma/client';

export class EnrollmentService {
  constructor(private readonly enrollmentRepository: EnrollmentRepository) {}

  async getAllEnrollments(schoolId: string, academicYearId?: string): Promise<Enrollment[]> {
    return this.enrollmentRepository.findAllBySchool(schoolId, academicYearId);
  }

  async getEnrollmentById(enrollmentId: string, schoolId: string): Promise<Enrollment> {
    const enrollment = await this.enrollmentRepository.findById(enrollmentId, schoolId);

    if (!enrollment) {
      throw new AppError(`Matrícula con id ${enrollmentId} no encontrada`, 404);
    }

    return enrollment;
  }

  /**
   * Matricula y genera el cronograma de cuotas del tarifario (misma transacción). Después aplica
   * las becas vigentes. Sin tarifario, matricula igual y devuelve un aviso.
   */
  async createEnrollment(
    schoolId: string,
    createEnrollmentDto: CreateEnrollmentDto,
    actorUserId?: string,
  ): Promise<Enrollment & { schedule: ScheduleResult & { scholarshipsApplied: number } }> {
    const existing = await prisma.enrollment.findUnique({
      where: { studentId_academicYearId: { studentId: createEnrollmentDto.studentId, academicYearId: createEnrollmentDto.academicYearId } },
      select: { id: true },
    });
    if (existing) throw new AppError('El estudiante ya cuenta con matrícula registrada para este año lectivo.', 409);
    const { enrollment, schedule } = await this.enrollmentRepository.create(schoolId, createEnrollmentDto);
    const scholarshipsApplied = await feeScheduleService.applyScholarships(schoolId, actorUserId, schedule);
    return { ...enrollment, schedule: { ...schedule, scholarshipsApplied } };
  }

  async updateEnrollment(
    enrollmentId: string,
    schoolId: string,
    updateEnrollmentDto: UpdateEnrollmentDto,
    actorUserId: string | null = null,
  ): Promise<Enrollment> {
    const existingEnrollment = await this.getEnrollmentById(enrollmentId, schoolId);
    return this.enrollmentRepository.update(
      enrollmentId,
      schoolId,
      updateEnrollmentDto,
      existingEnrollment,
      actorUserId,
    );
  }

  /** Vista previa del cronograma para el formulario de matrícula. */
  async previewSchedule(schoolId: string, input: { academicYearId: string; classroomId: string; condition: string }) {
    const { feeSchedule: _fee, ...plan } = await feeScheduleService.plan(prisma, schoolId, input);
    void _fee;
    return plan;
  }
}
