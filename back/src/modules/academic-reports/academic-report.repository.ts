import { prisma } from '../../config/prisma';
import { AppError } from '../../core/errors/app-error';
import { EducationLevel, EnrollmentState } from '@prisma/client';

export class AcademicReportRepository {
  /**
   * Catálogo de Aulas activas del colegio para el selector transversal de reportes.
   * Accesible para Docentes, Administrativos y Directores sin filtrar por cursos asignados.
   */
  async findAvailableClassrooms(schoolId: string, academicYearId?: string) {
    return prisma.classroom.findMany({
      where: {
        schoolId,
        ...(academicYearId
          ? {
              enrollments: {
                some: { academicYearId, schoolId },
              },
            }
          : {}),
      },
      select: {
        id: true,
        grade: true,
        section: true,
        educationLevel: true,
        shift: true,
        tutorTeacher: {
          select: {
            id: true,
            firstName: true,
            lastNamePaternal: true,
            lastNameMaternal: true,
          },
        },
        _count: {
          select: {
            enrollments: true,
            assignments: true,
          },
        },
      },
      orderBy: [
        { educationLevel: 'asc' },
        { grade: 'asc' },
        { section: 'asc' },
      ],
    });
  }

  /**
   * Obtiene la institución escolar por su ID con datos para encabezados de reportes.
   */
  async findSchoolHeader(schoolId: string) {
    return prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true,
        name: true,
        modularCode: true,
        documentId: true,
        address: true,
        logoUrl: true,
        department: true,
        province: true,
        district: true,
      },
    });
  }

  /**
   * Obtiene los criterios de evaluación activos para ponderación.
   */
  async findCriteria(schoolId: string, level?: EducationLevel) {
    return prisma.evaluationCriterion.findMany({
      where: {
        schoolId,
        isActive: true,
        OR: [
          { educationLevel: null },
          ...(level ? [{ educationLevel: level }] : []),
        ],
      },
      orderBy: { order: 'asc' },
    });
  }

  /**
   * Reporte 0021: Consolidado de Notas de un Aula y Periodo.
   */
  async findConsolidatedGradesRaw(
    schoolId: string,
    classroomId: string,
    periodNumber: number,
  ) {
    const classroom = await prisma.classroom.findFirst({
      where: { id: classroomId, schoolId },
      include: {
        school: {
          select: {
            id: true,
            name: true,
            modularCode: true,
            documentId: true,
            logoUrl: true,
            address: true,
          },
        },
        tutorTeacher: {
          select: {
            id: true,
            firstName: true,
            lastNamePaternal: true,
            lastNameMaternal: true,
          },
        },
        assignments: {
          include: {
            area: {
              include: {
                competences: true,
              },
            },
            teacher: {
              select: {
                id: true,
                firstName: true,
                lastNamePaternal: true,
                lastNameMaternal: true,
              },
            },
          },
          orderBy: [
            { area: { name: 'asc' } },
          ],
        },
        enrollments: {
          where: { schoolId },
          include: {
            student: {
              select: {
                id: true,
                studentCode: true,
                documentId: true,
                firstNames: true,
                lastNamePaternal: true,
                lastNameMaternal: true,
                gender: true,
              },
            },
          },
          orderBy: [
            { student: { lastNamePaternal: 'asc' } },
            { student: { lastNameMaternal: 'asc' } },
            { student: { firstNames: 'asc' } },
          ],
        },
      },
    });

    if (!classroom) {
      throw new AppError('El aula seleccionada no existe o no pertenece a su institución.', 404);
    }

    const assignmentIds = classroom.assignments.map((assignment) => assignment.id);
    const enrollmentIds = classroom.enrollments.map((enrollment) => enrollment.id);

    // Notas detalladas del salón en el periodo
    const detailedGrades = await prisma.detailedGrade.findMany({
      where: {
        schoolId,
        courseAssignmentId: { in: assignmentIds },
        periodNumber,
      },
      select: {
        enrollmentId: true,
        courseAssignmentId: true,
        competenceId: true,
        criterionId: true,
        numericScore: true,
        criterion: {
          select: {
            shortName: true,
            name: true,
            weight: true,
          },
        },
      },
    });

    // Asistencias agregadas de los estudiantes del aula
    const attendances = await prisma.attendance.findMany({
      where: {
        schoolId,
        enrollmentId: { in: enrollmentIds },
      },
      select: {
        enrollmentId: true,
        status: true,
      },
    });

    const criteria = await this.findCriteria(schoolId, classroom.educationLevel);

    return {
      classroom,
      criteria,
      detailedGrades,
      attendances,
    };
  }

  /**
   * Reporte 0048: Orden de Mérito y Tercios por Salón.
   */
  async findMeritClassroomRaw(
    schoolId: string,
    classroomId: string,
    periodNumber: number,
  ) {
    return this.findConsolidatedGradesRaw(schoolId, classroomId, periodNumber);
  }

  /**
   * Reporte 0049: Orden de Mérito y Tercios/Quintos por Grado (Todas las secciones).
   */
  async findMeritGradeRaw(
    schoolId: string,
    educationLevel: EducationLevel,
    grade: number,
    periodNumber: number,
    academicYearId?: string,
  ) {
    const school = await this.findSchoolHeader(schoolId);
    if (!school) {
      throw new AppError('Institución educativa no encontrada.', 404);
    }

    // Buscar todas las aulas de ese nivel y grado
    const classrooms = await prisma.classroom.findMany({
      where: {
        schoolId,
        educationLevel,
        grade,
      },
      include: {
        assignments: {
          include: {
            area: {
              include: {
                competences: true,
              },
            },
          },
        },
        enrollments: {
          where: {
            schoolId,
            ...(academicYearId ? { academicYearId } : {}),
          },
          include: {
            student: {
              select: {
                id: true,
                studentCode: true,
                documentId: true,
                firstNames: true,
                lastNamePaternal: true,
                lastNameMaternal: true,
                gender: true,
              },
            },
          },
          orderBy: [
            { student: { lastNamePaternal: 'asc' } },
            { student: { lastNameMaternal: 'asc' } },
            { student: { firstNames: 'asc' } },
          ],
        },
      },
      orderBy: { section: 'asc' },
    });

    const allAssignmentIds = classrooms.flatMap((c) => c.assignments.map((a) => a.id));

    const detailedGrades = await prisma.detailedGrade.findMany({
      where: {
        schoolId,
        courseAssignmentId: { in: allAssignmentIds },
        periodNumber,
      },
      select: {
        enrollmentId: true,
        courseAssignmentId: true,
        competenceId: true,
        criterionId: true,
        numericScore: true,
        criterion: {
          select: {
            shortName: true,
            name: true,
            weight: true,
          },
        },
      },
    });

    const criteria = await this.findCriteria(schoolId, educationLevel);

    return {
      school,
      classrooms,
      criteria,
      detailedGrades,
    };
  }

  /**
   * Reporte 0041: Registro Auxiliar Borrador para llenado a mano.
   */
  async findDraftRegisterRaw(
    schoolId: string,
    classroomId: string,
    courseAssignmentId?: string,
  ) {
    const classroom = await prisma.classroom.findFirst({
      where: { id: classroomId, schoolId },
      include: {
        school: {
          select: {
            name: true,
            logoUrl: true,
            modularCode: true,
          },
        },
        tutorTeacher: {
          select: {
            firstName: true,
            lastNamePaternal: true,
            lastNameMaternal: true,
          },
        },
        enrollments: {
          where: { schoolId, isActive: true },
          include: {
            student: {
              select: {
                id: true,
                studentCode: true,
                documentId: true,
                firstNames: true,
                lastNamePaternal: true,
                lastNameMaternal: true,
              },
            },
          },
          orderBy: [
            { student: { lastNamePaternal: 'asc' } },
            { student: { lastNameMaternal: 'asc' } },
            { student: { firstNames: 'asc' } },
          ],
        },
      },
    });

    if (!classroom) {
      throw new AppError('Aula no encontrada.', 404);
    }

    let assignment = null;
    if (courseAssignmentId) {
      assignment = await prisma.courseAssignment.findFirst({
        where: { id: courseAssignmentId, classroomId, schoolId },
        include: {
          area: {
            include: {
              competences: true,
            },
          },
          teacher: {
            select: {
              firstName: true,
              lastNamePaternal: true,
              lastNameMaternal: true,
            },
          },
        },
      });
    }

    return {
      classroom,
      assignment,
    };
  }

  /**
   * Reporte 0030: Listado de Comentarios a la Conducta.
   */
  async findConductCommentsRaw(
    schoolId: string,
    classroomId: string,
    periodNumber: number,
  ) {
    const classroom = await prisma.classroom.findFirst({
      where: { id: classroomId, schoolId },
      include: {
        school: {
          select: {
            name: true,
            logoUrl: true,
            modularCode: true,
          },
        },
        tutorTeacher: {
          select: {
            firstName: true,
            lastNamePaternal: true,
            lastNameMaternal: true,
          },
        },
        enrollments: {
          where: { schoolId },
          include: {
            student: {
              select: {
                id: true,
                studentCode: true,
                documentId: true,
                firstNames: true,
                lastNamePaternal: true,
                lastNameMaternal: true,
              },
            },
            detailedGrades: {
              where: {
                periodNumber,
                criterion: {
                  OR: [
                    { shortName: 'COND' },
                    { name: { contains: 'Conducta', mode: 'insensitive' } },
                  ],
                },
              },
              select: {
                numericScore: true,
                comment: true,
              },
            },
            competenceConclusions: {
              where: {
                periodNumber,
              },
              select: {
                conclusion: true,
              },
            },
          },
          orderBy: [
            { student: { lastNamePaternal: 'asc' } },
            { student: { lastNameMaternal: 'asc' } },
            { student: { firstNames: 'asc' } },
          ],
        },
      },
    });

    if (!classroom) {
      throw new AppError('Aula no encontrada.', 404);
    }

    return classroom;
  }

  /**
   * Reporte 0011: Reporte de Alumnos por Salón (Padrón Oficial).
   */
  async findClassroomRosterRaw(schoolId: string, classroomId: string) {
    const classroom = await prisma.classroom.findFirst({
      where: { id: classroomId, schoolId },
      include: {
        school: {
          select: {
            name: true,
            modularCode: true,
            documentId: true,
            logoUrl: true,
            address: true,
          },
        },
        tutorTeacher: {
          select: {
            firstName: true,
            lastNamePaternal: true,
            lastNameMaternal: true,
          },
        },
        enrollments: {
          where: { schoolId },
          include: {
            student: {
              include: {
                familyRelations: {
                  where: { isLegalGuardian: true },
                  include: {
                    user: {
                      select: {
                        firstName: true,
                        lastNamePaternal: true,
                        lastNameMaternal: true,
                        cellphone: true,
                        documentId: true,
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: [
            { student: { lastNamePaternal: 'asc' } },
            { student: { lastNameMaternal: 'asc' } },
            { student: { firstNames: 'asc' } },
          ],
        },
      },
    });

    if (!classroom) {
      throw new AppError('Aula no encontrada.', 404);
    }

    return classroom;
  }

  /**
   * Reporte 0001: Listado de Familias por Estado.
   */
  async findFamiliesByStateRaw(
    schoolId: string,
    state?: 'ALL' | 'REGISTERED' | 'TRANSFERRED' | 'WITHDRAWN',
    academicYearId?: string,
  ) {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        modularCode: true,
        documentId: true,
        address: true,
      },
    });

    if (!school) {
      throw new AppError('Colegio no encontrado.', 404);
    }

    const enrollmentsWhere: Record<string, unknown> = { schoolId };
    if (academicYearId) {
      enrollmentsWhere.academicYearId = academicYearId;
    }
    if (state && state !== 'ALL') {
      enrollmentsWhere.enrollmentState = state as EnrollmentState;
    }

    const students = await prisma.student.findMany({
      where: {
        schoolId,
        enrollments: {
          some: enrollmentsWhere,
        },
      },
      include: {
        familyRelations: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastNamePaternal: true,
                lastNameMaternal: true,
                documentId: true,
                cellphone: true,
                email: true,
              },
            },
          },
        },
        enrollments: {
          where: enrollmentsWhere,
          include: {
            classroom: {
              select: {
                grade: true,
                section: true,
                educationLevel: true,
              },
            },
          },
        },
      },
      orderBy: [
        { lastNamePaternal: 'asc' },
        { lastNameMaternal: 'asc' },
        { firstNames: 'asc' },
      ],
    });

    return { school, students };
  }

  /**
   * Reporte 0002: Listado de Familias e Hijos.
   */
  async findFamiliesWithChildrenRaw(
    schoolId: string,
    classroomId?: string,
    academicYearId?: string,
  ) {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        modularCode: true,
        documentId: true,
        address: true,
      },
    });

    if (!school) {
      throw new AppError('Colegio no encontrado.', 404);
    }

    const enrollmentsWhere: Record<string, unknown> = { schoolId, enrollmentState: 'REGISTERED' };
    if (academicYearId) enrollmentsWhere.academicYearId = academicYearId;
    if (classroomId) enrollmentsWhere.classroomId = classroomId;

    const students = await prisma.student.findMany({
      where: {
        schoolId,
        enrollments: {
          some: enrollmentsWhere,
        },
      },
      include: {
        familyRelations: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastNamePaternal: true,
                lastNameMaternal: true,
                cellphone: true,
                email: true,
                documentId: true,
              },
            },
          },
        },
        enrollments: {
          where: { schoolId },
          include: {
            classroom: {
              select: {
                grade: true,
                section: true,
                educationLevel: true,
              },
            },
          },
        },
      },
      orderBy: [
        { lastNamePaternal: 'asc' },
        { lastNameMaternal: 'asc' },
        { firstNames: 'asc' },
      ],
    });

    return { school, students };
  }

  /**
   * Reporte 0003: Listado de Familias y Parientes (Directorio Institucional).
   */
  async findFamiliesRelativesRaw(
    schoolId: string,
    classroomId?: string,
    academicYearId?: string,
  ) {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        modularCode: true,
        documentId: true,
        address: true,
      },
    });

    if (!school) {
      throw new AppError('Colegio no encontrado.', 404);
    }

    const enrollmentsWhere: Record<string, unknown> = { schoolId, enrollmentState: 'REGISTERED' };
    if (academicYearId) enrollmentsWhere.academicYearId = academicYearId;
    if (classroomId) enrollmentsWhere.classroomId = classroomId;

    const students = await prisma.student.findMany({
      where: {
        schoolId,
        enrollments: {
          some: enrollmentsWhere,
        },
      },
      include: {
        familyRelations: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastNamePaternal: true,
                lastNameMaternal: true,
                cellphone: true,
                email: true,
                documentId: true,
                documentType: true,
              },
            },
          },
        },
        enrollments: {
          where: { schoolId },
          include: {
            classroom: {
              select: {
                id: true,
                grade: true,
                section: true,
                educationLevel: true,
              },
            },
          },
          take: 1,
        },
      },
      orderBy: [
        { lastNamePaternal: 'asc' },
        { lastNameMaternal: 'asc' },
        { firstNames: 'asc' },
      ],
    });

    return { school, students };
  }

  /**
   * Reporte 0019: Listado de Cumpleaños del Alumno.
   */
  async findStudentBirthdaysRaw(
    schoolId: string,
    classroomId?: string,
    educationLevel?: EducationLevel,
    academicYearId?: string,
  ) {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        modularCode: true,
        documentId: true,
        address: true,
      },
    });

    if (!school) {
      throw new AppError('Colegio no encontrado.', 404);
    }

    const enrollmentsWhere: Record<string, unknown> = { schoolId, enrollmentState: 'REGISTERED' };
    if (academicYearId) enrollmentsWhere.academicYearId = academicYearId;
    if (classroomId) enrollmentsWhere.classroomId = classroomId;

    const students = await prisma.student.findMany({
      where: {
        schoolId,
        ...(educationLevel ? { enrollments: { some: { classroom: { educationLevel } } } } : {}),
        enrollments: {
          some: enrollmentsWhere,
        },
      },
      select: {
        id: true,
        studentCode: true,
        firstNames: true,
        lastNamePaternal: true,
        lastNameMaternal: true,
        birthDate: true,
        gender: true,
        enrollments: {
          where: enrollmentsWhere,
          include: {
            classroom: {
              select: {
                grade: true,
                section: true,
                educationLevel: true,
              },
            },
          },
          take: 1,
        },
      },
      orderBy: [
        { lastNamePaternal: 'asc' },
        { lastNameMaternal: 'asc' },
        { firstNames: 'asc' },
      ],
    });

    return { school, students };
  }
}
