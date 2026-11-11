import { z } from 'zod';

const level = z.enum(['INITIAL', 'PRIMARY', 'SECONDARY']);
const uuid = z.string().uuid();
const optionalYear = z.string().uuid().optional();
const letter = z.enum(['AD', 'A', 'B', 'C', 'EXO']);

export const studyPlanQuery = z.object({ academicYearId: optionalYear, level, grade: z.coerce.number().int() });
export const applyTemplateBody = z.object({
  academicYearId: optionalYear, level, grades: z.array(z.number().int()).min(1), includeOptional: z.array(z.string()).default([]),
});
export const subcoursesBody = z.object({
  academicYearId: optionalYear, level, grades: z.array(z.number().int()).min(1), officialAreaCode: z.string().min(2),
  subcourses: z.array(z.object({ name: z.string().trim().min(2).max(80), cnebNumbers: z.array(z.number().int()).min(1), weight: z.number().positive().max(10).optional() })).min(2),
});
export const workshopBody = z.object({
  academicYearId: optionalYear, level, grades: z.array(z.number().int()).min(1), name: z.string().trim().min(2).max(80), weeklyHours: z.number().int().min(0).max(40).nullable().optional(),
});
export const planCourseUpdateBody = z.object({ weeklyHours: z.number().int().min(0).max(40).nullable().optional(), order: z.number().int().min(0).max(999).optional() });
export const copyYearBody = z.object({ fromAcademicYearId: uuid, toAcademicYearId: uuid });
export const courseCompetencesBody = z.object({ competences: z.array(z.object({ cnebNumber: z.number().int().min(1).max(31), weight: z.number().positive().max(10).optional() })).min(1) });
export const renameCourseBody = z.object({ name: z.string().trim().min(2).max(80) });

export const teachingLoadQuery = z.object({ academicYearId: optionalYear, level });
export const teachingLoadBody = z.object({
  academicYearId: optionalYear,
  changes: z.array(z.object({ classroomId: uuid, areaId: uuid, teacherId: uuid.nullable() })).max(500),
});
export const wholeClassroomBody = z.object({ academicYearId: optionalYear, classroomId: uuid, teacherId: uuid });

export const yearQuery = z.object({ academicYearId: optionalYear });
export const periodStatusBody = z.object({
  academicYearId: optionalYear,
  periodNumber: z.number().int().min(1).max(4),
  classroomId: uuid.nullable().optional(),
  status: z.enum(['OPEN', 'REVIEW', 'CLOSED']),
  reason: z.string().trim().max(500).nullable().optional(),
  gradingDeadline: z.string().nullable().optional(),
  force: z.boolean().optional(),
});

export const gradebookQuery = z.object({ periodNumber: z.coerce.number().int().min(1).max(4) });
export const scoresBody = z.object({
  periodNumber: z.number().int().min(1).max(4),
  reason: z.string().trim().max(500).nullable().optional(),
  items: z.array(z.object({
    enrollmentId: uuid, competenceId: uuid, criterionId: uuid,
    numericScore: z.number().min(0).max(20).nullable(),
    literalScore: letter.nullable(),
  })).max(2000),
});
export const finalLetterBody = z.object({
  periodNumber: z.number().int().min(1).max(4),
  reason: z.string().trim().max(500).nullable().optional(),
  enrollmentId: uuid, competenceId: uuid, finalLetter: letter.nullable(),
});
export const conclusionsBody = z.object({
  periodNumber: z.number().int().min(1).max(4),
  reason: z.string().trim().max(500).nullable().optional(),
  items: z.array(z.object({ enrollmentId: uuid, competenceId: uuid, conclusion: z.string().max(2000) })).max(500),
});
export const courseCriteriaBody = z.object({ criteria: z.array(z.object({ criterionId: uuid, weight: z.number().positive().max(10).nullable().optional() })).max(20) });

export const progressQuery = z.object({ academicYearId: optionalYear, periodNumber: z.coerce.number().int().min(1).max(4), level: level.optional() });
export const remindBody = z.object({ academicYearId: optionalYear, periodNumber: z.number().int().min(1).max(4) });
export const consolidationQuery = z.object({
  academicYearId: optionalYear,
  classroomId: uuid,
  period: z.union([z.literal('FINAL'), z.coerce.number().int().min(1).max(4)]),
});
export const classroomQuery = z.object({ classroomId: uuid });
export const gradebookExportQuery = z.object({ assignmentId: uuid, periodNumber: z.coerce.number().int().min(1).max(4) });

