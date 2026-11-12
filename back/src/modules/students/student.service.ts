import { getSchoolNow } from '../../utils/timezone.util';
import { AppError } from '../../core/errors/app-error';
import { prisma } from '../../config/prisma';
import { hashPassword } from '../../utils/hash.util';
import { generateTemporaryPassword } from '../../utils/password.util';
import { invalidatePrincipalCache } from '../../core/security/principal-status';
import type { StudentRepository } from './student.repository';
import type {
  CreateStudentDto,
  UpdateStudentDto,
  StudentFilterDto,
  RegisterFichaMatriculaDto,
  BulkCredentialsDto,
} from './student.schema';
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

    // Contraseñas iniciales temporales criptográficamente seguras
    const guardianTemporaryPassword = generateTemporaryPassword();
    const guardianPasswordHash = await hashPassword(guardianTemporaryPassword);

    const studentTemporaryPassword = generateTemporaryPassword();
    const studentPasswordHash = await hashPassword(studentTemporaryPassword);

    const result = await this.studentRepository.registerFichaMatricula(
      schoolId,
      dto,
      guardianPasswordHash,
      studentPasswordHash,
    );

    // Retornar detalle completo del estudiante con credenciales temporales
    const student = await this.getStudentById(result.student.id, schoolId);
    return {
      ...student,
      temporaryCredentials: {
        student: { login: student.studentCode || student.documentId, password: studentTemporaryPassword },
        guardian: dto.guardian.newGuardian
          ? {
              login: dto.guardian.newGuardian.email || dto.guardian.newGuardian.documentId || '',
              password: guardianTemporaryPassword,
            }
          : null,
      },
    } as any;
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

  async resetPassword(
    studentId: string,
    schoolId: string,
    newPassword?: string,
  ): Promise<{ message: string; temporaryPassword: string }> {
    await this.getStudentById(studentId, schoolId);
    const temporaryPassword = newPassword?.trim() || generateTemporaryPassword();
    const passwordHash = await hashPassword(temporaryPassword);
    await this.studentRepository.updatePassword(studentId, schoolId, passwordHash);
    invalidatePrincipalCache('student', studentId);
    return {
      message: 'Contraseña restablecida. Entrega la contraseña temporal al usuario.',
      temporaryPassword,
    };
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

  async getMyChildren(
    schoolId: string,
    userContextOrParentId: string | { userId: string; role: string; studentId?: string },
  ) {
    if (typeof userContextOrParentId === 'string') {
      return this.studentRepository.findMyChildren(schoolId, userContextOrParentId);
    }

    if (userContextOrParentId.role === 'STUDENT') {
      const studentId = userContextOrParentId.studentId || userContextOrParentId.userId;
      const self = await this.studentRepository.findStudentSelf(schoolId, studentId);
      return self ? [self] : [];
    }

    return this.studentRepository.findMyChildren(schoolId, userContextOrParentId.userId);
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

    if (userContext?.role === 'PARENT' || userContext?.role === 'STUDENT') {
      const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { blockCertificatesOnOverdue: true } });
      if (school?.blockCertificatesOnOverdue) {
        const overdue = await prisma.paymentObligation.count({
          where: {
            schoolId,
            enrollment: { studentId },
            status: { in: ['PENDING', 'PARTIAL'] },
            dueDate: { lt: new Date() },
          },
        });
        if (overdue > 0) {
          throw new AppError(
            'La constancia oficial no puede emitirse mientras existan pensiones vencidas. Las notas, la libreta y la asistencia siguen disponibles. Acércate a Administración.',
            402,
          );
        }
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
    const [issueY, issueM, issueD] = getSchoolNow().dateStr.split('-').map(Number);
    const issueDate = `${issueD} de ${months[issueM - 1]} de ${issueY}`;

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

    if (userContext?.role === 'PARENT' || userContext?.role === 'STUDENT') {
      const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { blockCertificatesOnOverdue: true } });
      if (school?.blockCertificatesOnOverdue) {
        const overdue = await prisma.paymentObligation.count({
          where: {
            schoolId,
            enrollment: { studentId },
            status: { in: ['PENDING', 'PARTIAL'] },
            dueDate: { lt: new Date() },
          },
        });
        if (overdue > 0) {
          throw new AppError(
            'La constancia oficial no puede emitirse mientras existan pensiones vencidas. Las notas, la libreta y la asistencia siguen disponibles. Acércate a Administración.',
            402,
          );
        }
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
    const [issueY, issueM, issueD] = getSchoolNow().dateStr.split('-').map(Number);
    const issueDate = `${issueD} de ${months[issueM - 1]} de ${issueY}`;

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

  async generateBulkCredentials(
    schoolId: string,
    dto: BulkCredentialsDto,
  ): Promise<Array<{ id: string; fullName: string; login: string; temporaryPassword: string }>> {
    const enrollments = await prisma.enrollment.findMany({
      where: {
        schoolId,
        classroomId: dto.classroomId,
        isActive: true,
        academicYear: { isActive: true },
      },
      include: {
        student: {
          include: {
            familyRelations: {
              include: { user: true },
            },
          },
        },
      },
    });

    const results: Array<{ id: string; fullName: string; login: string; temporaryPassword: string }> = [];

    if (dto.target === 'STUDENTS') {
      for (const enr of enrollments) {
        const student = enr.student;
        if (dto.onlyPending && student.passwordHash && student.mustChangePassword === false) {
          continue;
        }
        const temporaryPassword = generateTemporaryPassword();
        const passwordHash = await hashPassword(temporaryPassword);
        await prisma.student.update({
          where: { id: student.id },
          data: {
            passwordHash,
            mustChangePassword: true,
            passwordChangedAt: new Date(),
            failedLoginAttempts: 0,
            lockedUntil: null,
          },
        });
        invalidatePrincipalCache('student', student.id);
        const fullName = `${student.lastNamePaternal} ${student.lastNameMaternal || ''}, ${student.firstNames}`.trim();
        const login = student.studentCode || student.documentId;
        results.push({ id: student.id, fullName, login, temporaryPassword });
      }
    } else {
      const processedUsers = new Set<string>();
      for (const enr of enrollments) {
        for (const rel of enr.student.familyRelations) {
          if (rel.isLegalGuardian && !processedUsers.has(rel.userId)) {
            processedUsers.add(rel.userId);
            const user = rel.user;
            if (dto.onlyPending && user.passwordHash && user.mustChangePassword === false) {
              continue;
            }
            const temporaryPassword = generateTemporaryPassword();
            const passwordHash = await hashPassword(temporaryPassword);
            await prisma.user.update({
              where: { id: user.id },
              data: {
                passwordHash,
                mustChangePassword: true,
                passwordChangedAt: new Date(),
                failedLoginAttempts: 0,
                lockedUntil: null,
              },
            });
            invalidatePrincipalCache('user', user.id);
            const fullName = `${user.lastNamePaternal} ${user.lastNameMaternal || ''}, ${user.firstName}`.trim();
            const login = user.email || user.documentId || '';
            results.push({ id: user.id, fullName, login, temporaryPassword });
          }
        }
      }
    }

    results.sort((a, b) => a.fullName.localeCompare(b.fullName, 'es'));
    return results;
  }
}
