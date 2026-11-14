import { classroomYearService } from './classroom-year.service';
import { enrollmentsOfYear } from '../../utils/academic-year-scope';
import { prisma } from '../../config/prisma';
import type { Prisma, Classroom } from '@prisma/client';
import type { CreateClassroomDto, UpdateClassroomDto } from './classroom.schema';

export const TUTOR_TEACHER_SELECT = {
  id: true,
  firstName: true,
  lastNamePaternal: true,
  lastNameMaternal: true,
  email: true,
} as const;

const CLASSROOM_INCLUDE = {
  tutorTeacher: { select: TUTOR_TEACHER_SELECT },
} as const;

export type ClassroomWithTutor = Prisma.ClassroomGetPayload<{ include: typeof CLASSROOM_INCLUDE }>;
export type ClassroomWithStats = ClassroomWithTutor & { enrolledCount: number; openInYear: boolean; academicYearId: string | null };

const ORDER: Prisma.ClassroomOrderByWithRelationInput[] = [{ educationLevel: 'asc' }, { grade: 'asc' }, { section: 'asc' }, { shift: 'asc' }];

export class ClassroomRepository {
  /**
   * Aulas del año elegido (o del vigente) con sus matriculados, vacantes y tutor de ese año. Si el
   * año ya definió sus secciones, solo devuelve las abiertas (salvo `includeClosed`).
   */
  async findAllBySchool(schoolId: string, academicYearId?: string, includeClosed = false): Promise<ClassroomWithStats[]> {
    const yearId = await classroomYearService.resolveYearId(schoolId, academicYearId);
    const [rooms, counts, sections] = await Promise.all([
      prisma.classroom.findMany({ where: { schoolId }, include: CLASSROOM_INCLUDE, orderBy: ORDER }),
      prisma.enrollment.groupBy({ by: ['classroomId'], where: { schoolId, ...enrollmentsOfYear(academicYearId) }, _count: { _all: true } }),
      yearId ? classroomYearService.sectionsOf(schoolId, yearId) : Promise.resolve([]),
    ]);
    const hasSections = sections.length > 0;
    const isCurrent = !academicYearId;
    return rooms
      .map((r) => {
        const sec = sections.find((s) => s.classroomId === r.id);
        return {
          ...r,
          capacity: sec?.capacity ?? r.capacity,
          tutorTeacherId: sec ? sec.tutorTeacherId : isCurrent ? r.tutorTeacherId : null,
          tutorTeacher: sec ? sec.tutorTeacher : isCurrent ? r.tutorTeacher : null,
          openInYear: !hasSections || !!sec,
          academicYearId: yearId,
          enrolledCount: counts.find((c) => c.classroomId === r.id)?._count._all ?? 0,
        };
      })
      .filter((r) => includeClosed || r.openInYear);
  }

  async findById(classroomId: string, schoolId: string): Promise<ClassroomWithTutor | null> {
    return prisma.classroom.findFirst({ where: { id: classroomId, schoolId }, include: CLASSROOM_INCLUDE });
  }

  async findBySlot(schoolId: string, slot: { educationLevel: Classroom['educationLevel']; grade: number; section: string; shift: Classroom['shift'] }) {
    return prisma.classroom.findFirst({ where: { schoolId, ...slot } });
  }

  async findByTutor(schoolId: string, tutorTeacherId: string) {
    return prisma.classroom.findFirst({ where: { schoolId, tutorTeacherId } });
  }

  async countActiveEnrollments(classroomId: string): Promise<number> {
    return prisma.enrollment.count({ where: { classroomId, isActive: true } });
  }

  async countUsage(classroomId: string): Promise<{ enrollments: number; assignments: number }> {
    const [enrollments, assignments] = await Promise.all([
      prisma.enrollment.count({ where: { classroomId } }),
      prisma.courseAssignment.count({ where: { classroomId, deletedAt: null } }),
    ]);
    return { enrollments, assignments };
  }

  async create(schoolId: string, data: CreateClassroomDto): Promise<ClassroomWithTutor> {
    return prisma.classroom.create({ data: { ...data, schoolId }, include: CLASSROOM_INCLUDE });
  }

  async update(classroomId: string, schoolId: string, data: UpdateClassroomDto): Promise<ClassroomWithTutor> {
    return prisma.classroom.update({ where: { id: classroomId, schoolId }, data, include: CLASSROOM_INCLUDE });
  }

  async delete(classroomId: string, schoolId: string): Promise<Classroom> {
    return prisma.classroom.delete({ where: { id: classroomId, schoolId } });
  }
}
