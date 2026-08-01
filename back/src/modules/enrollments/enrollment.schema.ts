import { z } from 'zod';

export const createEnrollmentSchema = z.object({
  studentId: z.string().uuid(),
  academicYearId: z.string().uuid(),
  classroomId: z.string().uuid(),
  previousSchoolModularCode: z.string().optional(),
  repeatingGrade: z.boolean().default(false),
});

export const updateEnrollmentSchema = z.object({
  classroomId: z.string().uuid().optional(),
  enrollmentState: z.enum(['REGISTERED', 'TRANSFERRED', 'WITHDRAWN']).optional(),
  isActive: z.boolean().optional(),
});

export type CreateEnrollmentDto = z.infer<typeof createEnrollmentSchema>;
export type UpdateEnrollmentDto = z.infer<typeof updateEnrollmentSchema>;
