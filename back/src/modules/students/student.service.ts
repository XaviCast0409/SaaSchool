import { AppError } from '../../core/errors/app-error';
import { hashPassword } from '../../utils/hash.util';
import type { StudentRepository } from './student.repository';
import type { CreateStudentDto, UpdateStudentDto, StudentFilterDto, RegisterFichaMatriculaDto } from './student.schema';
import type { Student } from '@prisma/client';
import type { PaginatedResult } from '../../core/interfaces/global.interfaces';
import { SIAGIE_CATALOGS } from './student.catalogs';

const PLAN_STUDENT_QUOTAS: Record<string, number> = {
  BASIC: 150,
  PRO: 500,
  ENTERPRISE: Infinity,
};

export class StudentService {
  constructor(private readonly studentRepository: StudentRepository) {}

  getCatalogs() {
    return SIAGIE_CATALOGS;
  }

  async getAllStudents(
    schoolId: string,
    filters: StudentFilterDto = { page: 1, limit: 10 },
  ): Promise<PaginatedResult<Student>> {
    return this.studentRepository.findAllBySchool(schoolId, filters);
  }

  async getStudentById(studentId: string, schoolId: string): Promise<Student> {
    const student = await this.studentRepository.findById(studentId, schoolId);

    if (!student) {
      throw new AppError(`Estudiante con id ${studentId} no encontrado`, 404);
    }

    return student;
  }

  async createStudent(schoolId: string, createStudentDto: CreateStudentDto): Promise<Student> {
    // 1. Control de Cuotas de Alumnos por Plan SaaS (Upsell & Fair Use)
    const [currentCount, schoolPlan] = await Promise.all([
      this.studentRepository.countBySchool(schoolId),
      this.studentRepository.getSchoolPlan(schoolId),
    ]);

    const maxQuota = PLAN_STUDENT_QUOTAS[schoolPlan] ?? 150;
    if (currentCount >= maxQuota) {
      throw new AppError(
        `Límite de alumnos alcanzado (${currentCount}/${maxQuota}) para el Plan ${schoolPlan}. Por favor solicita la actualización a un plan superior para registrar más alumnos.`,
        403,
      );
    }

    // 2. Validación de Documento Único por Colegio
    if (createStudentDto.documentId) {
      const existingDoc = await this.studentRepository.findByDocumentId(schoolId, createStudentDto.documentId);
      if (existingDoc) {
        throw new AppError(
          `El DNI/Documento "${createStudentDto.documentId}" ya se encuentra registrado para el alumno "${existingDoc.firstNames} ${existingDoc.lastNamePaternal}".`,
          409,
        );
      }
    }

    // 3. Validación de Código SIAGIE Único
    if (createStudentDto.studentCode) {
      const existingCode = await this.studentRepository.findByStudentCode(schoolId, createStudentDto.studentCode);
      if (existingCode) {
        throw new AppError(
          `El Código SIAGIE "${createStudentDto.studentCode}" ya pertenece al alumno "${existingCode.firstNames} ${existingCode.lastNamePaternal}".`,
          409,
        );
      }
    }

    return this.studentRepository.create(schoolId, createStudentDto);
  }

  /**
   * Registro transaccional de Ficha de Matrícula SIAGIE
   */
  async registerFichaMatricula(
    schoolId: string,
    dto: RegisterFichaMatriculaDto,
  ): Promise<Student> {
    // Validar cuotas de plan si el alumno no existe previamente en el colegio
    const existingStudent = await this.studentRepository.findByDocumentId(
      schoolId,
      dto.student.documentId,
    );

    if (!existingStudent) {
      const [currentCount, schoolPlan] = await Promise.all([
        this.studentRepository.countBySchool(schoolId),
        this.studentRepository.getSchoolPlan(schoolId),
      ]);

      const maxQuota = PLAN_STUDENT_QUOTAS[schoolPlan] ?? 150;
      if (currentCount >= maxQuota) {
        throw new AppError(
          `Límite de alumnos alcanzado (${currentCount}/${maxQuota}) para el Plan ${schoolPlan}. Actualiza tu suscripción para matricular nuevos alumnos.`,
          403,
        );
      }
    }

    // Contraseña por defecto para nuevo apoderado si aplica
    const defaultPassword = 'Familia' + new Date().getFullYear() + '!';
    const passwordHash = await hashPassword(defaultPassword);

    const result = await this.studentRepository.registerFichaMatricula(
      schoolId,
      dto,
      passwordHash,
    );

    // Retornar detalle completo del estudiante con su matrícula y familia
    return this.getStudentById(result.student.id, schoolId);
  }

  async updateStudent(
    studentId: string,
    schoolId: string,
    updateStudentDto: UpdateStudentDto,
  ): Promise<Student> {
    await this.getStudentById(studentId, schoolId);

    if (updateStudentDto.documentId) {
      const existingDoc = await this.studentRepository.findByDocumentId(schoolId, updateStudentDto.documentId);
      if (existingDoc && existingDoc.id !== studentId) {
        throw new AppError(
          `El DNI/Documento "${updateStudentDto.documentId}" ya está registrado para otro estudiante (${existingDoc.firstNames} ${existingDoc.lastNamePaternal}).`,
          409,
        );
      }
    }

    return this.studentRepository.update(studentId, schoolId, updateStudentDto);
  }

  async deleteStudent(studentId: string, schoolId: string): Promise<Student> {
    await this.getStudentById(studentId, schoolId);
    return this.studentRepository.delete(studentId, schoolId);
  }
}
