import type { Classroom, EducationLevel } from '@prisma/client';
import { AppError } from '../../core/errors/app-error';
import { prisma } from '../../config/prisma';
import type { ClassroomRepository, ClassroomWithStats, ClassroomWithTutor } from './classroom.repository';
import type { BulkCreateClassroomsDto, CreateClassroomDto, UpdateClassroomDto } from './classroom.schema';
import { TeachingLoadService } from '../academic/teaching-load.service';
import { isValidGrade } from '../academic/cneb.catalog';

const teachingLoad = new TeachingLoadService();
const LEVEL: Record<EducationLevel, string> = { INITIAL: 'Inicial', PRIMARY: 'Primaria', SECONDARY: 'Secundaria' };
const SHIFT: Record<string, string> = { MORNING: 'mañana', AFTERNOON: 'tarde', NIGHT: 'noche' };
const label = (c: { educationLevel: EducationLevel; grade: number; section: string }) =>
  `${c.educationLevel === 'INITIAL' ? `${c.grade} años` : `${c.grade}.° ${LEVEL[c.educationLevel]}`} "${c.section}"`;

export class ClassroomService {
  constructor(private readonly classroomRepository: ClassroomRepository) {}

  /** El tutor debe ser docente activo del colegio y no ser tutor de otra aula. */
  private async validateTutorTeacher(schoolId: string, tutorTeacherId: string | null | undefined, classroomId?: string): Promise<void> {
    if (!tutorTeacherId) return;
    const teacher = await prisma.user.findFirst({ where: { id: tutorTeacherId, schoolId, role: 'TEACHER', isActive: true } });
    if (!teacher) {
      throw new AppError('El docente elegido como tutor no existe, no está activo o no pertenece a este colegio.', 400);
    }
    const other = await this.classroomRepository.findByTutor(schoolId, tutorTeacherId);
    if (other && other.id !== classroomId) {
      throw new AppError(
        `${teacher.firstName} ${teacher.lastNamePaternal} ya es tutor(a) de ${label(other)}. Cada docente solo puede ser tutor de una aula: quítalo de esa aula primero.`,
        409,
      );
    }
  }

  private async assertSlotFree(schoolId: string, slot: { educationLevel: EducationLevel; grade: number; section: string; shift: Classroom['shift'] }, classroomId?: string) {
    const existing = await this.classroomRepository.findBySlot(schoolId, slot);
    if (existing && existing.id !== classroomId) {
      throw new AppError(`Ya existe el aula ${label(slot)} en el turno ${SHIFT[slot.shift]}.`, 409);
    }
  }

  async getAllClassrooms(schoolId: string): Promise<ClassroomWithStats[]> {
    return this.classroomRepository.findAllBySchool(schoolId);
  }

  async getClassroomById(classroomId: string, schoolId: string): Promise<ClassroomWithTutor> {
    const classroom = await this.classroomRepository.findById(classroomId, schoolId);
    if (!classroom) throw new AppError('Aula no encontrada.', 404);
    return classroom;
  }

  async createClassroom(schoolId: string, dto: CreateClassroomDto): Promise<ClassroomWithTutor> {
    await this.assertSlotFree(schoolId, { educationLevel: dto.educationLevel, grade: dto.grade, section: dto.section, shift: dto.shift });
    await this.validateTutorTeacher(schoolId, dto.tutorTeacherId);
    const result = await this.classroomRepository.create(schoolId, dto);
    if (dto.tutorTeacherId) await teachingLoad.syncTutorTransversal(schoolId, result.id);
    return result;
  }

  /** Crea varias aulas (grados × secciones); omite las que ya existen. */
  async bulkCreateClassrooms(schoolId: string, dto: BulkCreateClassroomsDto): Promise<{ created: string[]; skipped: string[] }> {
    const created: string[] = [];
    const skipped: string[] = [];
    const sections = [...new Set(dto.sections)];
    for (const grade of [...new Set(dto.grades)].sort((a, b) => a - b)) {
      for (const section of sections) {
        const slot = { educationLevel: dto.educationLevel, grade, section, shift: dto.shift };
        if (await this.classroomRepository.findBySlot(schoolId, slot)) {
          skipped.push(label(slot));
          continue;
        }
        await this.classroomRepository.create(schoolId, { ...slot, capacity: dto.capacity, tutorTeacherId: null });
        created.push(label(slot));
      }
    }
    return { created, skipped };
  }

  async updateClassroom(classroomId: string, schoolId: string, dto: UpdateClassroomDto): Promise<ClassroomWithTutor> {
    const current = await this.getClassroomById(classroomId, schoolId);
    const next = {
      educationLevel: dto.educationLevel ?? current.educationLevel,
      grade: dto.grade ?? current.grade,
      section: dto.section ?? current.section,
      shift: dto.shift ?? current.shift,
    };
    if (!isValidGrade(next.educationLevel, next.grade)) throw new AppError('El grado no corresponde al nivel.', 400);

    // Cambiar nivel o grado de un aula en uso movería a sus alumnos y descuadraría plan y carga docente
    if (next.educationLevel !== current.educationLevel || next.grade !== current.grade) {
      const usage = await this.classroomRepository.countUsage(classroomId);
      if (usage.enrollments > 0 || usage.assignments > 0) {
        throw new AppError(
          `No se puede cambiar el nivel o grado de ${label(current)}: ya tiene ${usage.enrollments} matrícula(s) y ${usage.assignments} curso(s) asignado(s). Crea una nueva aula para el otro grado.`,
          409,
        );
      }
    }
    if (next.section !== current.section || next.shift !== current.shift || next.educationLevel !== current.educationLevel || next.grade !== current.grade) {
      await this.assertSlotFree(schoolId, next, classroomId);
    }
    if (dto.capacity !== undefined) {
      const enrolled = await this.classroomRepository.countActiveEnrollments(classroomId);
      if (dto.capacity < enrolled) {
        throw new AppError(`La capacidad no puede ser menor que los ${enrolled} estudiantes ya matriculados en ${label(current)}.`, 400);
      }
    }
    if (dto.tutorTeacherId !== undefined) await this.validateTutorTeacher(schoolId, dto.tutorTeacherId, classroomId);

    const updated = await this.classroomRepository.update(classroomId, schoolId, dto);
    if (dto.tutorTeacherId) await teachingLoad.syncTutorTransversal(schoolId, classroomId);
    return updated;
  }

  async deleteClassroom(classroomId: string, schoolId: string): Promise<Classroom> {
    const current = await this.getClassroomById(classroomId, schoolId);
    const usage = await this.classroomRepository.countUsage(classroomId);
    if (usage.enrollments > 0 || usage.assignments > 0) {
      throw new AppError(
        `No se puede eliminar ${label(current)}: tiene ${usage.enrollments} matrícula(s) y ${usage.assignments} curso(s) asignado(s) (también de años anteriores).`,
        409,
      );
    }
    return this.classroomRepository.delete(classroomId, schoolId);
  }
}
