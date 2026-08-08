import { AppError } from '../../core/errors/app-error';
import type { StudentRepository } from './student.repository';
import type { CreateStudentDto, UpdateStudentDto, StudentFilterDto } from './student.schema';
import type { Student } from '@prisma/client';
import type { PaginatedResult } from '../../core/interfaces/global.interfaces';

export class StudentService {
  constructor(private readonly studentRepository: StudentRepository) {}

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
    if (createStudentDto.documentId) {
      const existingDoc = await this.studentRepository.findByDocumentId(schoolId, createStudentDto.documentId);
      if (existingDoc) {
        throw new AppError(
          `El DNI/Documento "${createStudentDto.documentId}" ya se encuentra registrado para el alumno "${existingDoc.firstNames} ${existingDoc.lastNamePaternal}".`,
          409,
        );
      }
    }

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
