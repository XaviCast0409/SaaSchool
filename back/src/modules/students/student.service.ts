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

    // Contraseña inicial para nuevo apoderado: número de DNI para máxima practicidad
    const parentDni = dto.guardian.newGuardian?.documentId?.trim();
    const defaultPassword = parentDni || ('Familia' + new Date().getFullYear() + '!');
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

  async getNominaMatricula(schoolId: string, classroomId: string) {
    const { classroom, enrollments } = await this.studentRepository.getNominaByClassroom(schoolId, classroomId);

    const activeAcademicYear = enrollments[0]?.academicYear ?? null;

    const students = enrollments.map((enrollment) => {
      const student = enrollment.student;
      const guardianRel =
        student.familyRelations.find((rel) => rel.isLegalGuardian) ??
        student.familyRelations[0] ??
        null;

      let guardianData = null;
      if (guardianRel?.user) {
        const u = guardianRel.user;
        const fullName = `${u.lastNamePaternal} ${u.lastNameMaternal ? `${u.lastNameMaternal}, ` : ', '}${u.firstName}`.trim();
        guardianData = {
          relationshipType: guardianRel.relationshipType,
          isLegalGuardian: guardianRel.isLegalGuardian,
          documentType: u.documentType,
          documentId: u.documentId,
          fullName,
          cellphone: u.cellphone,
          email: u.email,
        };
      }

      return {
        id: student.id,
        studentCode: student.studentCode,
        documentType: student.documentType,
        documentId: student.documentId,
        firstNames: student.firstNames,
        lastNamePaternal: student.lastNamePaternal,
        lastNameMaternal: student.lastNameMaternal,
        gender: student.gender,
        birthDate: student.birthDate,
        birthCountry: student.birthCountry,
        birthUbigeo: student.birthUbigeo,
        birthDepartment: student.birthDepartment,
        birthProvince: student.birthProvince,
        birthDistrict: student.birthDistrict,
        residenceUbigeo: student.residenceUbigeo,
        motherTongue: student.motherTongue,
        hasDisability: student.hasDisability,
        disabilityType: student.disabilityType,
        address: student.address,
        condition: enrollment.condition,
        repeatingGrade: enrollment.repeatingGrade,
        enrollmentDate: enrollment.enrollmentDate,
        guardian: guardianData,
      };
    });

    return {
      school: classroom.school,
      classroom: {
        id: classroom.id,
        grade: classroom.grade,
        section: classroom.section,
        educationLevel: classroom.educationLevel,
        shift: classroom.shift,
        tutorTeacher: classroom.tutorTeacher,
      },
      academicYear: activeAcademicYear,
      totalStudents: students.length,
      students,
    };
  }

  async getMyChildren(schoolId: string, parentUserId: string) {
    return this.studentRepository.findMyChildren(schoolId, parentUserId);
  }

  async getEnrollmentCertificate(
    schoolId: string,
    studentId: string,
    userContext?: { userId: string; role: string; studentId?: string },
  ) {
    const student = await this.studentRepository.findStudentForCertificate(studentId, schoolId);
    if (!student) {
      throw new AppError('Estudiante no encontrado.', 404);
    }

    // IDOR
    if (userContext?.role === 'STUDENT') {
      const currentStudentId = userContext.studentId || userContext.userId;
      if (student.id !== currentStudentId) {
        throw new AppError('No tienes permisos para ver esta constancia.', 403);
      }
    } else if (userContext?.role === 'PARENT') {
      const isParent = (student.familyRelations || []).some((rel) => rel.userId === userContext.userId);
      if (!isParent) {
        throw new AppError('No tienes permisos para ver esta constancia.', 403);
      }
    }

    const activeEnrollment = student.enrollments[0];
    if (!activeEnrollment) {
      throw new AppError('El estudiante no cuenta con una matrícula activa registrada.', 400);
    }

    const months = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
    ];
    const today = new Date();
    const issueDate = `${today.getDate()} de ${months[today.getMonth()]} de ${today.getFullYear()}`;

    return {
      certificateType: 'ENROLLMENT',
      certificateNumber: `CE-${student.studentCode || student.documentId}-${activeEnrollment.academicYear.year}`,
      issueDate,
      school: {
        name: student.school.name,
        modularCode: student.school.modularCode,
        documentId: student.school.documentId,
        address: student.school.address,
        logoUrl: student.school.logoUrl,
      },
      student: {
        id: student.id,
        fullName: `${student.lastNamePaternal} ${student.lastNameMaternal || ''}, ${student.firstNames}`.trim(),
        documentType: student.documentType,
        documentId: student.documentId,
        studentCode: student.studentCode,
      },
      enrollment: {
        id: activeEnrollment.id,
        grade: activeEnrollment.classroom.grade,
        section: activeEnrollment.classroom.section,
        educationLevel: activeEnrollment.classroom.educationLevel,
        shift: activeEnrollment.classroom.shift,
        academicYear: activeEnrollment.academicYear.year,
        enrollmentDate: activeEnrollment.enrollmentDate,
      },
    };
  }

  async getNoDebtCertificate(
    schoolId: string,
    studentId: string,
    userContext?: { userId: string; role: string; studentId?: string },
  ) {
    const student = await this.studentRepository.findStudentForCertificate(studentId, schoolId);
    if (!student) {
      throw new AppError('Estudiante no encontrado.', 404);
    }

    // IDOR
    if (userContext?.role === 'STUDENT') {
      const currentStudentId = userContext.studentId || userContext.userId;
      if (student.id !== currentStudentId) {
        throw new AppError('No tienes permisos para ver esta constancia.', 403);
      }
    } else if (userContext?.role === 'PARENT') {
      const isParent = (student.familyRelations || []).some((rel) => rel.userId === userContext.userId);
      if (!isParent) {
        throw new AppError('No tienes permisos para ver esta constancia.', 403);
      }
    }

    const activeEnrollment = student.enrollments[0];
    if (!activeEnrollment) {
      throw new AppError('El estudiante no cuenta con una matrícula activa registrada.', 400);
    }

    const pendingObligationsCount = await this.studentRepository.countStudentPendingObligations(studentId, schoolId);
    if (pendingObligationsCount > 0) {
      throw new AppError(
        `No se puede emitir la Constancia de No Adeudo porque el estudiante presenta ${pendingObligationsCount} obligación(es) de pago pendiente(s).`,
        400,
      );
    }

    const months = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
    ];
    const today = new Date();
    const issueDate = `${today.getDate()} de ${months[today.getMonth()]} de ${today.getFullYear()}`;

    return {
      certificateType: 'NO_DEBT',
      certificateNumber: `CNA-${student.studentCode || student.documentId}-${activeEnrollment.academicYear.year}`,
      issueDate,
      school: {
        name: student.school.name,
        modularCode: student.school.modularCode,
        documentId: student.school.documentId,
        address: student.school.address,
        logoUrl: student.school.logoUrl,
      },
      student: {
        id: student.id,
        fullName: `${student.lastNamePaternal} ${student.lastNameMaternal || ''}, ${student.firstNames}`.trim(),
        documentType: student.documentType,
        documentId: student.documentId,
        studentCode: student.studentCode,
      },
      academicYear: activeEnrollment.academicYear.year,
      status: 'CLEARED',
    };
  }
}
