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
    return this.studentRepository.create(schoolId, createStudentDto);
  }

  async updateStudent(
    studentId: string,
    schoolId: string,
    updateStudentDto: UpdateStudentDto,
  ): Promise<Student> {
    await this.getStudentById(studentId, schoolId);
    return this.studentRepository.update(studentId, schoolId, updateStudentDto);
  }

  async deleteStudent(studentId: string, schoolId: string): Promise<Student> {
    await this.getStudentById(studentId, schoolId);
    return this.studentRepository.delete(studentId, schoolId);
  }
}
