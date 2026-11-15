import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../core/errors/app-error';
import { TeachingLoadService } from '../academic/teaching-load.service';

type Db = Prisma.TransactionClient | typeof prisma;

const LEVEL: Record<string, string> = { INITIAL: 'Inicial', PRIMARY: 'Primaria', SECONDARY: 'Secundaria' };
const label = (c: { educationLevel: string; grade: number; section: string }) =>
  `${c.educationLevel === 'INITIAL' ? `${c.grade} años` : `${c.grade}.° ${LEVEL[c.educationLevel]}`} "${c.section}"`;

const TUTOR = { select: { id: true, firstName: true, lastNamePaternal: true, lastNameMaternal: true, email: true, avatarUrl: true } } as const;

/**
 * Secciones por año: qué aulas abre el colegio cada año, con qué vacantes y qué tutor. El año
 * vigente se refleja también en Classroom (capacidad y tutor), que usa la operación diaria.
 */
export class ClassroomYearService {
  /** ¿El año ya tiene sus secciones definidas? Si no, se consideran abiertas todas las aulas. */
  async yearHasSections(db: Db, schoolId: string, academicYearId: string): Promise<boolean> {
    return (await db.classroomYear.count({ where: { schoolId, academicYearId } })) > 0;
  }

  async resolveYearId(schoolId: string, academicYearId?: string): Promise<string | null> {
    if (academicYearId) return academicYearId;
    const active = await prisma.academicYear.findFirst({ where: { schoolId, isActive: true }, select: { id: true } });
    return active?.id ?? null;
  }

  /** Secciones del año (para el aula: abierta, vacantes y tutor de ese año). */
  async sectionsOf(schoolId: string, academicYearId: string) {
    return prisma.classroomYear.findMany({ where: { schoolId, academicYearId }, include: { tutorTeacher: TUTOR } });
  }

  /** Impide matricular en una sección que el año no abrió (si el año ya definió sus secciones). */
  async assertOpen(db: Db, schoolId: string, classroomId: string, academicYearId: string): Promise<void> {
    if (!(await this.yearHasSections(db, schoolId, academicYearId))) return;
    const row = await db.classroomYear.findUnique({ where: { classroomId_academicYearId: { classroomId, academicYearId } } });
    if (row) return;
    const [room, year] = await Promise.all([
      db.classroom.findUnique({ where: { id: classroomId }, select: { educationLevel: true, grade: true, section: true } }),
      db.academicYear.findUnique({ where: { id: academicYearId }, select: { year: true } }),
    ]);
    throw new AppError(
      `La sección ${room ? label(room) : ''} no está abierta en ${year?.year ?? 'ese año'}. Ábrela en Aulas antes de matricular.`,
      400,
    );
  }

  /**
   * Vacantes de una sección en un año: capacidad de la sección (o del aula si el año no definió
   * secciones) y matrículas vigentes (estado REGISTERED; isActive solo vale para el año activo).
   */
  async vacancyOf(db: Db, schoolId: string, classroomId: string, academicYearId: string) {
    const [section, room, enrolled] = await Promise.all([
      db.classroomYear.findUnique({ where: { classroomId_academicYearId: { classroomId, academicYearId } }, select: { capacity: true } }),
      db.classroom.findFirst({ where: { id: classroomId, schoolId }, select: { capacity: true, educationLevel: true, grade: true, section: true } }),
      db.enrollment.count({ where: { schoolId, classroomId, academicYearId, enrollmentState: 'REGISTERED' } }),
    ]);
    const capacity = section?.capacity ?? room?.capacity ?? 0;
    return { capacity, enrolled, free: Math.max(0, capacity - enrolled), label: room ? label(room) : 'la sección' };
  }

  /** Impide matricular por encima de las vacantes de la sección. */
  async assertHasVacancy(db: Db, schoolId: string, classroomId: string, academicYearId: string, adding = 1): Promise<void> {
    const v = await this.vacancyOf(db, schoolId, classroomId, academicYearId);
    if (v.capacity > 0 && v.enrolled + adding > v.capacity) {
      throw new AppError(
        `${v.label} no tiene vacantes libres (${v.enrolled} matriculados para ${v.capacity} vacantes). Aumenta las vacantes en Aulas o elige otra sección.`,
        409,
      );
    }
  }

  /** Abre, cierra o ajusta (vacantes y tutor) una sección en un año. */
  async setSection(
    schoolId: string,
    classroomId: string,
    academicYearId: string,
    input: { open: boolean; capacity?: number; tutorTeacherId?: string | null },
  ) {
    const [room, year] = await Promise.all([
      prisma.classroom.findFirst({ where: { id: classroomId, schoolId } }),
      prisma.academicYear.findFirst({ where: { id: academicYearId, schoolId }, select: { id: true, year: true, isActive: true } }),
    ]);
    if (!room) throw new AppError('Aula no encontrada.', 404);
    if (!year) throw new AppError('Año académico no encontrado.', 404);
    const enrolled = await prisma.enrollment.count({ where: { classroomId, academicYearId, enrollmentState: 'REGISTERED' } });

    if (!input.open) {
      if (enrolled > 0) throw new AppError(`No se puede cerrar ${label(room)} en ${year.year}: tiene ${enrolled} estudiantes matriculados.`, 409);
      // Si es la primera sección que se define del año, las demás aulas quedan abiertas como hasta ahora
      if (!(await this.yearHasSections(prisma, schoolId, academicYearId))) await this.openAll(schoolId, academicYearId, year.isActive);
      await prisma.classroomYear.deleteMany({ where: { classroomId, academicYearId } });
      if (year.isActive) await prisma.classroom.update({ where: { id: classroomId }, data: { tutorTeacherId: null } });
      return { open: false };
    }

    const capacity = input.capacity ?? room.capacity;
    if (capacity < enrolled) throw new AppError(`Las vacantes no pueden ser menos que los ${enrolled} estudiantes ya matriculados.`, 400);
    if (input.tutorTeacherId) {
      const teacher = await prisma.user.findFirst({ where: { id: input.tutorTeacherId, schoolId, role: 'TEACHER', isActive: true }, select: { firstName: true, lastNamePaternal: true } });
      if (!teacher) throw new AppError('El docente elegido como tutor no existe o no está activo.', 400);
      const other = await prisma.classroomYear.findFirst({
        where: { academicYearId, tutorTeacherId: input.tutorTeacherId, NOT: { classroomId } },
        include: { classroom: { select: { educationLevel: true, grade: true, section: true } } },
      });
      if (other) {
        throw new AppError(`${teacher.firstName} ${teacher.lastNamePaternal} ya es tutor(a) de ${label(other.classroom)} en ${year.year}.`, 409);
      }
    }
    if (!(await this.yearHasSections(prisma, schoolId, academicYearId))) await this.openAll(schoolId, academicYearId, year.isActive);
    const row = await prisma.classroomYear.upsert({
      where: { classroomId_academicYearId: { classroomId, academicYearId } },
      create: { schoolId, classroomId, academicYearId, capacity, tutorTeacherId: input.tutorTeacherId ?? null },
      update: { capacity, ...(input.tutorTeacherId !== undefined ? { tutorTeacherId: input.tutorTeacherId } : {}) },
      include: { tutorTeacher: TUTOR },
    });
    // El año vigente se refleja en el aula (lo usan asistencia, notas y tutoría)
    if (year.isActive) await this.mirrorToClassroom(schoolId, classroomId, row.capacity, row.tutorTeacherId);
    return { open: true, section: row };
  }

  /** Al definir la primera sección de un año sin secciones, se abren todas (estado previo implícito). */
  private async openAll(schoolId: string, academicYearId: string, isActive: boolean) {
    const rooms = await prisma.classroom.findMany({ where: { schoolId }, select: { id: true, capacity: true, tutorTeacherId: true } });
    await prisma.classroomYear.createMany({
      data: rooms.map((r) => ({ schoolId, classroomId: r.id, academicYearId, capacity: r.capacity, tutorTeacherId: isActive ? r.tutorTeacherId : null })),
      skipDuplicates: true,
    });
  }

  private async mirrorToClassroom(schoolId: string, classroomId: string, capacity: number, tutorTeacherId: string | null) {
    if (tutorTeacherId) {
      await prisma.classroom.updateMany({ where: { schoolId, tutorTeacherId, NOT: { id: classroomId } }, data: { tutorTeacherId: null } });
    }
    await prisma.classroom.update({ where: { id: classroomId }, data: { capacity, tutorTeacherId } });
    if (tutorTeacherId) await new TeachingLoadService().syncTutorTransversal(schoolId, classroomId);
  }

  /** Copia las secciones de un año a otro (solo las que faltan). Con `includeTutors`, también el tutor. */
  async copyYear(schoolId: string, fromAcademicYearId: string, toAcademicYearId: string, includeTutors: boolean) {
    if (fromAcademicYearId === toAcademicYearId) throw new AppError('Elige años distintos.', 400);
    const [from, to] = await Promise.all([
      prisma.academicYear.findFirst({ where: { id: fromAcademicYearId, schoolId }, select: { id: true } }),
      prisma.academicYear.findFirst({ where: { id: toAcademicYearId, schoolId }, select: { id: true, isActive: true } }),
    ]);
    if (!from || !to) throw new AppError('Año académico no encontrado.', 404);
    const sourceHas = await this.yearHasSections(prisma, schoolId, from.id);
    const source = sourceHas
      ? await prisma.classroomYear.findMany({ where: { schoolId, academicYearId: from.id } })
      : (await prisma.classroom.findMany({ where: { schoolId } })).map((c) => ({ classroomId: c.id, capacity: c.capacity, tutorTeacherId: c.tutorTeacherId }));
    const existing = new Set((await prisma.classroomYear.findMany({ where: { academicYearId: to.id }, select: { classroomId: true } })).map((r) => r.classroomId));
    const takenTutors = new Set(
      (await prisma.classroomYear.findMany({ where: { academicYearId: to.id, tutorTeacherId: { not: null } }, select: { tutorTeacherId: true } })).map((r) => r.tutorTeacherId),
    );
    const rows = source
      .filter((r) => !existing.has(r.classroomId))
      .map((r) => {
        const tutor = includeTutors && r.tutorTeacherId && !takenTutors.has(r.tutorTeacherId) ? r.tutorTeacherId : null;
        if (tutor) takenTutors.add(tutor);
        return { schoolId, classroomId: r.classroomId, academicYearId: to.id, capacity: r.capacity, tutorTeacherId: tutor };
      });
    if (rows.length) await prisma.classroomYear.createMany({ data: rows, skipDuplicates: true });
    return { copied: rows.length, skipped: source.length - rows.length };
  }

  /** Al activar un año: capacidad y tutor de cada aula pasan a ser los de ese año. */
  async syncOnActivation(tx: Prisma.TransactionClient, schoolId: string, academicYearId: string): Promise<string[]> {
    const rows = await tx.classroomYear.findMany({ where: { schoolId, academicYearId } });
    if (rows.length === 0) return [];
    // Si el año que se activa no tiene ningún tutor asignado (p. ej. un año que nunca se preparó),
    // se conservan los tutores actuales de las aulas y se registran en ese año, en vez de borrarlos.
    if (!rows.some((r) => r.tutorTeacherId)) {
      const rooms = await tx.classroom.findMany({ where: { schoolId }, select: { id: true, tutorTeacherId: true } });
      for (const r of rows) {
        const tutor = rooms.find((c) => c.id === r.classroomId)?.tutorTeacherId ?? null;
        await tx.classroom.update({ where: { id: r.classroomId }, data: { capacity: r.capacity } });
        if (tutor) await tx.classroomYear.update({ where: { id: r.id }, data: { tutorTeacherId: tutor } });
      }
      return rows.filter((r) => rooms.find((c) => c.id === r.classroomId)?.tutorTeacherId).map((r) => r.classroomId);
    }
    await tx.classroom.updateMany({ where: { schoolId }, data: { tutorTeacherId: null } });
    for (const r of rows) {
      await tx.classroom.update({ where: { id: r.classroomId }, data: { capacity: r.capacity, tutorTeacherId: r.tutorTeacherId } });
    }
    return rows.filter((r) => r.tutorTeacherId).map((r) => r.classroomId);
  }

  /** Mantiene la sección del año vigente al editar el aula (capacidad y tutor). */
  async mirrorFromClassroom(schoolId: string, classroomId: string) {
    const active = await prisma.academicYear.findFirst({ where: { schoolId, isActive: true }, select: { id: true } });
    if (!active) return;
    const room = await prisma.classroom.findUnique({ where: { id: classroomId }, select: { capacity: true, tutorTeacherId: true } });
    if (!room) return;
    if (room.tutorTeacherId) {
      await prisma.classroomYear.updateMany({
        where: { academicYearId: active.id, tutorTeacherId: room.tutorTeacherId, NOT: { classroomId } },
        data: { tutorTeacherId: null },
      });
    }
    await prisma.classroomYear.upsert({
      where: { classroomId_academicYearId: { classroomId, academicYearId: active.id } },
      create: { schoolId, classroomId, academicYearId: active.id, capacity: room.capacity, tutorTeacherId: room.tutorTeacherId },
      update: { capacity: room.capacity, tutorTeacherId: room.tutorTeacherId },
    });
  }

  /** Aula nueva: queda abierta en el año vigente y en el año con matrícula abierta (si ya tienen secciones). */
  async openNewClassroom(schoolId: string, classroomId: string) {
    const years = await prisma.academicYear.findMany({ where: { schoolId, OR: [{ isActive: true }, { enrollmentOpen: true }] }, select: { id: true, isActive: true } });
    const room = await prisma.classroom.findUnique({ where: { id: classroomId }, select: { capacity: true, tutorTeacherId: true } });
    if (!room) return;
    for (const y of years) {
      if (!y.isActive && !(await this.yearHasSections(prisma, schoolId, y.id))) continue;
      await prisma.classroomYear.upsert({
        where: { classroomId_academicYearId: { classroomId, academicYearId: y.id } },
        create: { schoolId, classroomId, academicYearId: y.id, capacity: room.capacity, tutorTeacherId: y.isActive ? room.tutorTeacherId : null },
        update: {},
      });
    }
  }
}

export const classroomYearService = new ClassroomYearService();
