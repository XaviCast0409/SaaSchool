import { prisma } from '../../config/prisma';
import type { Prisma, EducationLevel, EvaluationCriterion, Grade, GradeEntry } from '@prisma/client';
import type {
  CreateCriterionDto,
  UpdateCriterionDto,
  BatchGradeItemDto,
  BatchSaveConclusionsDto,
  CreateGradeDto,
  CreateGradeEntryDto,
} from './grade.schema';
import { AppError } from '../../core/errors/app-error';

export type ReportCardEnrollment = Prisma.EnrollmentGetPayload<{
  include: {
    student: {
      include: {
        school: true;
      };
    };
    classroom: {
      include: {
        assignments: {
          include: {
            area: {
              include: {
                competences: true;
              };
            };
            teacher: {
              select: {
                id: true;
                firstName: true;
                lastNamePaternal: true;
                lastNameMaternal: true;
              };
            };
          };
        };
      };
    };
    academicYear: true;
    attendances: true;
    detailedGrades: {
      include: {
        criterion: true;
        competence: true;
      };
    };
    competenceConclusions: true;
  };
}>;

export class GradeRepository {
  // ============================================================================
  // 1. CRITERIOS / RUBROS EVALUATIVOS (Configuración del Colegio)
  // ============================================================================

  /**
   * Obtiene los criterios evaluativos del colegio.
   * Si no existen criterios previos, auto-genera los 4 criterios estándar oficiales.
   */
  async findCriteria(schoolId: string, level?: EducationLevel): Promise<EvaluationCriterion[]> {
    const existing = await prisma.evaluationCriterion.findMany({
      where: {
        schoolId,
        isActive: true,
        ...(level ? { OR: [{ educationLevel: level }, { educationLevel: null }] } : {}),
      },
      orderBy: { order: 'asc' },
    });

    if (existing.length > 0) {
      return existing;
    }

    // Auto-seed de criterios por defecto si el colegio no tiene ninguno aún
    const defaultCriteria = [
      { name: 'Práctica Calificada', shortName: 'PC', order: 1, weight: 1.0 },
      { name: 'Conducta y Actitud', shortName: 'COND', order: 2, weight: 1.0 },
      { name: 'Revisión de Cuaderno', shortName: 'RC', order: 3, weight: 1.0 },
      { name: 'Examen Bimestral', shortName: 'EB', order: 4, weight: 1.0 },
    ];

    await prisma.evaluationCriterion.createMany({
      data: defaultCriteria.map((c) => ({
        ...c,
        schoolId,
        isActive: true,
      })),
    });

    return prisma.evaluationCriterion.findMany({
      where: { schoolId, isActive: true },
      orderBy: { order: 'asc' },
    });
  }

  async createCriterion(schoolId: string, data: CreateCriterionDto): Promise<EvaluationCriterion> {
    return prisma.evaluationCriterion.create({
      data: {
        schoolId,
        name: data.name,
        shortName: data.shortName,
        weight: data.weight,
        order: data.order,
        educationLevel: data.educationLevel ?? null,
      },
    });
  }

  async updateCriterion(
    schoolId: string,
    id: string,
    data: UpdateCriterionDto,
  ): Promise<EvaluationCriterion> {
    const criterion = await prisma.evaluationCriterion.findFirst({
      where: { id, schoolId },
    });

    if (!criterion) {
      throw new AppError('Criterio de evaluación no encontrado.', 404);
    }

    return prisma.evaluationCriterion.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.shortName !== undefined ? { shortName: data.shortName } : {}),
        ...(data.weight !== undefined ? { weight: data.weight } : {}),
        ...(data.order !== undefined ? { order: data.order } : {}),
        ...(data.educationLevel !== undefined ? { educationLevel: data.educationLevel } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });
  }

  async deleteCriterion(schoolId: string, id: string): Promise<void> {
    const criterion = await prisma.evaluationCriterion.findFirst({
      where: { id, schoolId },
    });

    if (!criterion) {
      throw new AppError('Criterio de evaluación no encontrado.', 404);
    }

    // Soft-delete para no romper notas históricas
    await prisma.evaluationCriterion.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ============================================================================
  // 2. MATRIZ DE CALIFICACIONES (Estilo Cubicol / Excel)
  // ============================================================================

  /**
   * Obtiene la estructura completa para la tabla de calificaciones:
   * - Curso y competencias CNEB
   * - Lista de criterios evaluativos
   * - Alumnos matriculados en el aula
   * - Calificaciones detalladas ya registradas
   */
  async findCourseMatrixData(
    schoolId: string,
    courseAssignmentId: string,
    periodNumber: number,
    teacherId?: string,
  ) {
    const assignment = await prisma.courseAssignment.findFirst({
      where: {
        id: courseAssignmentId,
        schoolId,
        ...(teacherId ? { teacherId } : {}),
      },
      include: {
        area: {
          include: {
            competences: true,
          },
        },
        classroom: {
          include: {
            enrollments: {
              where: {
                schoolId,
                isActive: true,
              },
              include: {
                student: {
                  select: {
                    id: true,
                    firstNames: true,
                    lastNamePaternal: true,
                    lastNameMaternal: true,
                    studentCode: true,
                    documentId: true,
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
    });

    if (!assignment) {
      throw new AppError(
        'Asignación de curso no encontrada o no tienes permisos para gestionar este curso.',
        404,
      );
    }

    // Criterios aplicables al nivel del aula
    const criteria = await this.findCriteria(schoolId, assignment.classroom.educationLevel);

    // Notas existentes en ese periodo
    const detailedGrades = await prisma.detailedGrade.findMany({
      where: {
        schoolId,
        courseAssignmentId,
        periodNumber,
      },
      select: {
        id: true,
        enrollmentId: true,
        competenceId: true,
        criterionId: true,
        numericScore: true,
        comment: true,
      },
    });

    return {
      assignment,
      criteria,
      detailedGrades,
    };
  }

  /**
   * Guarda de forma masiva las notas de la matriz en una sola transacción segura.
   */
  async batchUpsertDetailedGrades(
    schoolId: string,
    courseAssignmentId: string,
    periodNumber: number,
    grades: BatchGradeItemDto[],
    teacherId?: string,
  ): Promise<number> {
    const assignment = await prisma.courseAssignment.findFirst({
      where: {
        id: courseAssignmentId,
        schoolId,
        ...(teacherId ? { teacherId } : {}),
      },
      select: { classroomId: true },
    });

    if (!assignment) {
      throw new AppError('No tienes permisos para registrar notas en este curso o no existe.', 403);
    }

    if (teacherId) {
      const isLocked = await this.isPeriodLocked(schoolId, periodNumber, assignment.classroomId);
      if (isLocked) {
        throw new AppError(
          `El ${periodNumber}° Bimestre se encuentra cerrado y auditado por la Dirección. No se permiten modificaciones.`,
          403,
        );
      }
    }

    if (grades.length === 0) {
      return 0;
    }

    // Ejecución transaccional para garantizar consistencia atómica
    await prisma.$transaction(
      grades.map((grade) =>
        prisma.detailedGrade.upsert({
          where: {
            enrollmentId_courseAssignmentId_competenceId_criterionId_periodNumber: {
              enrollmentId: grade.enrollmentId,
              courseAssignmentId,
              competenceId: grade.competenceId,
              criterionId: grade.criterionId,
              periodNumber,
            },
          },
          update: {
            numericScore: grade.numericScore,
            comment: grade.comment ?? null,
          },
          create: {
            schoolId,
            enrollmentId: grade.enrollmentId,
            courseAssignmentId,
            competenceId: grade.competenceId,
            criterionId: grade.criterionId,
            periodNumber,
            numericScore: grade.numericScore,
            comment: grade.comment ?? null,
          },
        }),
      ),
    );

    return grades.length;
  }

  // ============================================================================
  // 3. CONCLUSIONES DESCRIPTIVAS POR COMPETENCIA (CUBICOL / MINEDU)
  // ============================================================================

  /**
   * Obtiene los alumnos con su nota en la competencia y su conclusión descriptiva.
   */
  async findCompetenceConclusions(
    schoolId: string,
    courseAssignmentId: string,
    periodNumber: number,
    competenceId?: string,
    teacherId?: string,
  ) {
    const assignment = await prisma.courseAssignment.findFirst({
      where: {
        id: courseAssignmentId,
        schoolId,
        ...(teacherId ? { teacherId } : {}),
      },
      include: {
        area: {
          include: {
            competences: true,
          },
        },
        classroom: {
          include: {
            enrollments: {
              where: {
                schoolId,
                isActive: true,
              },
              include: {
                student: {
                  select: {
                    id: true,
                    firstNames: true,
                    lastNamePaternal: true,
                    lastNameMaternal: true,
                    studentCode: true,
                    documentId: true,
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
    });

    if (!assignment) {
      throw new AppError(
        'Asignación de curso no encontrada o no tienes permisos para acceder.',
        404,
      );
    }

    const competences = assignment.area.competences || [];
    const targetCompetence =
      competences.find((c) => c.id === competenceId) || competences[0];

    if (!targetCompetence) {
      throw new AppError('Este curso no tiene competencias registradas.', 400);
    }

    // Criterios de evaluación para calcular el promedio ponderado de la competencia
    const criteria = await this.findCriteria(schoolId, assignment.classroom.educationLevel);
    const criteriaWeightMap = new Map(criteria.map((c) => [c.id, c.weight || 1]));

    // Notas del curso en esta competencia para el periodo
    const detailedGrades = await prisma.detailedGrade.findMany({
      where: {
        schoolId,
        courseAssignmentId,
        competenceId: targetCompetence.id,
        periodNumber,
      },
      select: {
        enrollmentId: true,
        criterionId: true,
        numericScore: true,
      },
    });

    // Mapear notas por enrollmentId
    const gradesMap = new Map<string, Array<{ criterionId: string; numericScore: number }>>();
    detailedGrades.forEach((g) => {
      if (!gradesMap.has(g.enrollmentId)) {
        gradesMap.set(g.enrollmentId, []);
      }
      gradesMap.get(g.enrollmentId)!.push({
        criterionId: g.criterionId,
        numericScore: g.numericScore,
      });
    });

    // Conclusiones descriptivas existentes
    const existingConclusions = await prisma.competenceConclusion.findMany({
      where: {
        schoolId,
        courseAssignmentId,
        competenceId: targetCompetence.id,
        periodNumber,
      },
      select: {
        enrollmentId: true,
        conclusion: true,
      },
    });
    const conclusionsMap = new Map(
      existingConclusions.map((c) => [c.enrollmentId, c.conclusion]),
    );

    // Preparar lista de estudiantes
    const students = assignment.classroom.enrollments.map((enr, idx) => {
      const student = enr.student;
      const fullName = `${student.lastNamePaternal} ${student.lastNameMaternal || ''}, ${student.firstNames}`.trim();

      const items = gradesMap.get(enr.id) || [];
      let score: number | null = null;
      let letter: 'AD' | 'A' | 'B' | 'C' | null = null;

      if (items.length > 0) {
        const totalWeight = items.reduce(
          (acc, it) => acc + (criteriaWeightMap.get(it.criterionId) || 1),
          0,
        );
        const weightedSum = items.reduce(
          (acc, it) => acc + it.numericScore * (criteriaWeightMap.get(it.criterionId) || 1),
          0,
        );
        score = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 10) / 10 : null;
        if (score !== null) {
          letter =
            score >= 17.5 ? 'AD' : score >= 13.5 ? 'A' : score >= 10.5 ? 'B' : 'C';
        }
      }

      return {
        enrollmentId: enr.id,
        orderIndex: idx + 1,
        studentId: student.id,
        fullName,
        documentId: student.documentId,
        studentCode: student.studentCode,
        score,
        letter,
        conclusion: conclusionsMap.get(enr.id) || '',
      };
    });

    return {
      assignment: {
        id: assignment.id,
        areaName: assignment.area.name,
        officialCode: assignment.area.officialCode,
        classroom: {
          id: assignment.classroom.id,
          grade: assignment.classroom.grade,
          section: assignment.classroom.section,
          educationLevel: assignment.classroom.educationLevel,
        },
        teacher: {
          firstName: assignment.teacher.firstName,
          lastNamePaternal: assignment.teacher.lastNamePaternal,
        },
        competences: competences.map((c) => ({
          id: c.id,
          name: c.name,
          description: c.description,
        })),
      },
      selectedCompetence: {
        id: targetCompetence.id,
        name: targetCompetence.name,
        description: targetCompetence.description,
      },
      periodNumber,
      students,
    };
  }

  /**
   * Guarda de forma masiva las conclusiones descriptivas de una competencia.
   */
  async batchUpsertCompetenceConclusions(
    schoolId: string,
    dto: BatchSaveConclusionsDto,
    teacherId?: string,
  ) {
    const assignment = await prisma.courseAssignment.findFirst({
      where: {
        id: dto.courseAssignmentId,
        schoolId,
        ...(teacherId ? { teacherId } : {}),
      },
      select: { classroomId: true },
    });

    if (!assignment) {
      throw new AppError(
        'Asignación de curso no encontrada o no tienes permisos para editarla.',
        404,
      );
    }

    if (teacherId) {
      const isLocked = await this.isPeriodLocked(schoolId, dto.periodNumber, assignment.classroomId);
      if (isLocked) {
        throw new AppError(
          `El ${dto.periodNumber}° Bimestre se encuentra cerrado y auditado por la Dirección. No se permiten modificaciones.`,
          403,
        );
      }
    }

    await prisma.$transaction(
      dto.conclusions.map((item) =>
        prisma.competenceConclusion.upsert({
          where: {
            enrollmentId_courseAssignmentId_competenceId_periodNumber: {
              enrollmentId: item.enrollmentId,
              courseAssignmentId: dto.courseAssignmentId,
              competenceId: dto.competenceId,
              periodNumber: dto.periodNumber,
            },
          },
          update: {
            conclusion: item.conclusion,
          },
          create: {
            schoolId,
            enrollmentId: item.enrollmentId,
            courseAssignmentId: dto.courseAssignmentId,
            competenceId: dto.competenceId,
            periodNumber: dto.periodNumber,
            conclusion: item.conclusion,
          },
        }),
      ),
    );

    return dto.conclusions.length;
  }

  // ============================================================================
  // 4. REPORTE / LIBRETA DE NOTAS Y CONSOLIDADOS
  // ============================================================================

  /**
   * Obtiene todos los datos para generar la Boleta / Libreta de Notas de un estudiante.
   */
  async findReportCardByEnrollment(
    schoolId: string,
    enrollmentId: string,
  ): Promise<ReportCardEnrollment> {
    const enrollment = await prisma.enrollment.findFirst({
      where: { id: enrollmentId, schoolId },
      include: {
        student: {
          include: {
            school: true,
          },
        },
        classroom: {
          include: {
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
            },
          },
        },
        academicYear: true,
        attendances: true,
        detailedGrades: {
          include: {
            criterion: true,
            competence: true,
          },
        },
        competenceConclusions: true,
      },
    });

    if (!enrollment) {
      throw new AppError('Matrícula de estudiante no encontrada.', 404);
    }

    return enrollment;
  }

  /**
   * Auditoría de avance de llenado de notas por aula para la validación SIAGIE.
   */
  async findSiagieSummary(schoolId: string, classroomId: string, periodNumber: number) {
    const classroom = await prisma.classroom.findFirst({
      where: { id: classroomId, schoolId },
      include: {
        school: {
          select: {
            name: true,
            modularCode: true,
            documentId: true,
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
        },
        enrollments: {
          where: { schoolId, isActive: true },
          include: {
            student: {
              select: {
                id: true,
                firstNames: true,
                lastNamePaternal: true,
                lastNameMaternal: true,
                documentId: true,
                studentCode: true,
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

    const totalStudents = classroom.enrollments.length;
    const criteria = await this.findCriteria(schoolId, classroom.educationLevel);
    const criteriaCount = criteria.length;
    const criteriaWeightMap = new Map(criteria.map((c) => [c.id, c.weight || 1]));

    const assignmentIds = classroom.assignments.map((a) => a.id);

    // Obtener todas las notas detalladas del aula en el periodo
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
      },
    });

    // Mapeo en memoria de notas por clave: `${enrollmentId}_${courseAssignmentId}_${competenceId}`
    const gradesMap = new Map<string, Array<{ criterionId: string; numericScore: number }>>();
    detailedGrades.forEach((g) => {
      const key = `${g.enrollmentId}_${g.courseAssignmentId}_${g.competenceId}`;
      if (!gradesMap.has(key)) {
        gradesMap.set(key, []);
      }
      gradesMap.get(key)!.push({ criterionId: g.criterionId, numericScore: g.numericScore });
    });

    // Resumen por curso para auditoría de avance de docentes
    const courseSummaries = classroom.assignments.map((assignment) => {
      const competenceCount = assignment.area.competences.length;
      const totalExpectedGrades = totalStudents * competenceCount * criteriaCount;

      const filledGradesCount = detailedGrades.filter(
        (g) => g.courseAssignmentId === assignment.id,
      ).length;

      const percentage =
        totalExpectedGrades > 0
          ? Math.min(100, Math.round((filledGradesCount / totalExpectedGrades) * 100))
          : 0;

      return {
        assignmentId: assignment.id,
        areaName: assignment.area.name,
        officialCode: assignment.area.officialCode,
        teacherName: `Prof. ${assignment.teacher.firstName} ${assignment.teacher.lastNamePaternal}`,
        competenceCount,
        totalExpectedGrades,
        filledGradesCount,
        percentage,
        isComplete: percentage === 100,
      };
    });

    const overallPercentage =
      courseSummaries.length > 0
        ? Math.round(
            courseSummaries.reduce((acc, c) => acc + c.percentage, 0) / courseSummaries.length,
          )
        : 0;

    // Generar la matriz consolidada de alumnos
    const students = classroom.enrollments.map((enr, idx) => {
      const student = enr.student;
      const fullName = `${student.lastNamePaternal} ${student.lastNameMaternal || ''}, ${student.firstNames}`.trim();

      const courseGrades: Record<
        string,
        {
          periodScore: number | null;
          letter: 'AD' | 'A' | 'B' | 'C' | null;
          competences: Record<
            string,
            { score: number | null; letter: 'AD' | 'A' | 'B' | 'C' | null }
          >;
        }
      > = {};

      const validCourseScores: number[] = [];

      classroom.assignments.forEach((assignment) => {
        const compGrades: Record<
          string,
          { score: number | null; letter: 'AD' | 'A' | 'B' | 'C' | null }
        > = {};
        const validCompScores: number[] = [];

        assignment.area.competences.forEach((comp) => {
          const key = `${enr.id}_${assignment.id}_${comp.id}`;
          const items = gradesMap.get(key) || [];

          if (items.length > 0) {
            const totalWeight = items.reduce(
              (acc, it) => acc + (criteriaWeightMap.get(it.criterionId) || 1),
              0,
            );
            const weightedSum = items.reduce(
              (acc, it) => acc + it.numericScore * (criteriaWeightMap.get(it.criterionId) || 1),
              0,
            );
            const score = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 10) / 10 : null;
            const letter =
              score !== null
                ? score >= 17.5
                  ? 'AD'
                  : score >= 13.5
                  ? 'A'
                  : score >= 10.5
                  ? 'B'
                  : 'C'
                : null;
            compGrades[comp.id] = { score, letter };
            if (score !== null) validCompScores.push(score);
          } else {
            compGrades[comp.id] = { score: null, letter: null };
          }
        });

        const periodScore =
          validCompScores.length > 0
            ? Math.round(
                (validCompScores.reduce((a, b) => a + b, 0) / validCompScores.length) * 10,
              ) / 10
            : null;
        const letter =
          periodScore !== null
            ? periodScore >= 17.5
              ? 'AD'
              : periodScore >= 13.5
              ? 'A'
              : periodScore >= 10.5
              ? 'B'
              : 'C'
            : null;

        courseGrades[assignment.id] = {
          periodScore,
          letter,
          competences: compGrades,
        };

        if (periodScore !== null) {
          validCourseScores.push(periodScore);
        }
      });

      const generalScore =
        validCourseScores.length > 0
          ? Math.round(
              (validCourseScores.reduce((a, b) => a + b, 0) / validCourseScores.length) * 10,
            ) / 10
          : null;
      const generalLetter =
        generalScore !== null
          ? generalScore >= 17.5
            ? 'AD'
            : generalScore >= 13.5
            ? 'A'
            : generalScore >= 10.5
            ? 'B'
            : 'C'
          : null;

      return {
        enrollmentId: enr.id,
        orderIndex: idx + 1,
        documentId: student.documentId,
        studentCode: student.studentCode,
        fullName,
        courseGrades,
        generalScore,
        generalLetter,
      };
    });

    const coursesMatrix = classroom.assignments.map((a) => ({
      id: a.id,
      name: a.area.name,
      officialCode: a.area.officialCode,
      teacherName: `Prof. ${a.teacher.firstName} ${a.teacher.lastNamePaternal}`,
      competences: a.area.competences.map((c) => ({
        id: c.id,
        name: c.name,
      })),
    }));

    return {
      school: {
        name: classroom.school.name,
        modularCode: classroom.school.modularCode,
        documentId: classroom.school.documentId,
      },
      classroomId: classroom.id,
      grade: classroom.grade,
      section: classroom.section,
      educationLevel: classroom.educationLevel,
      totalStudents,
      periodNumber,
      overallPercentage,
      courses: courseSummaries,
      matrix: {
        courses: coursesMatrix,
        students,
      },
    };
  }

  // ============================================================================
  // 4. CIERRE Y BLOQUEO DE ACTAS / PERIODOS (Auditoría Dirección)
  // ============================================================================

  /**
   * Obtiene el estado de bloqueo de un periodo para un aula o a nivel de colegio.
   */
  async findPeriodLock(schoolId: string, periodNumber: number, classroomId?: string) {
    if (classroomId) {
      const classLock = await prisma.gradingPeriodLock.findFirst({
        where: {
          schoolId,
          periodNumber,
          classroomId,
        },
        include: {
          lockedBy: {
            select: {
              firstName: true,
              lastNamePaternal: true,
            },
          },
        },
      });

      if (classLock) {
        return {
          isLocked: classLock.isLocked,
          lockedAt: classLock.lockedAt,
          lockedBy: classLock.lockedBy
            ? `${classLock.lockedBy.firstName} ${classLock.lockedBy.lastNamePaternal}`
            : undefined,
          reason: classLock.reason,
          classroomId: classLock.classroomId,
          periodNumber: classLock.periodNumber,
        };
      }
    }

    // Si no hay bloqueo de aula específico, verificar si hay un bloqueo general de colegio
    const schoolLock = await prisma.gradingPeriodLock.findFirst({
      where: {
        schoolId,
        periodNumber,
        classroomId: null,
      },
      include: {
        lockedBy: {
          select: {
            firstName: true,
            lastNamePaternal: true,
          },
        },
      },
    });

    if (schoolLock) {
      return {
        isLocked: schoolLock.isLocked,
        lockedAt: schoolLock.lockedAt,
        lockedBy: schoolLock.lockedBy
          ? `${schoolLock.lockedBy.firstName} ${schoolLock.lockedBy.lastNamePaternal}`
          : undefined,
        reason: schoolLock.reason,
        classroomId: null,
        periodNumber: schoolLock.periodNumber,
      };
    }

    return {
      isLocked: false,
      periodNumber,
      classroomId: classroomId || null,
    };
  }

  async isPeriodLocked(schoolId: string, periodNumber: number, classroomId?: string): Promise<boolean> {
    const lock = await this.findPeriodLock(schoolId, periodNumber, classroomId);
    return lock.isLocked;
  }

  /**
   * Bloquea o reabre un periodo para un aula o a nivel institucional.
   */
  async togglePeriodLock(
    schoolId: string,
    periodNumber: number,
    isLocked: boolean,
    lockedById: string,
    classroomId?: string | null,
    reason?: string | null,
  ) {
    const existing = await prisma.gradingPeriodLock.findFirst({
      where: {
        schoolId,
        periodNumber,
        classroomId: classroomId || null,
      },
    });

    if (existing) {
      return prisma.gradingPeriodLock.update({
        where: { id: existing.id },
        data: {
          isLocked,
          lockedAt: new Date(),
          lockedById,
          reason: reason ?? null,
        },
      });
    }

    return prisma.gradingPeriodLock.create({
      data: {
        schoolId,
        classroomId: classroomId || null,
        periodNumber,
        isLocked,
        lockedById,
        reason: reason ?? null,
      },
    });
  }

  // ============================================================================
  // 4. MÉTODOS LEGACY (Compatibilidad)
  // ============================================================================

  async findGradesByEnrollment(
    enrollmentId: string,
    schoolId: string,
    teacherId?: string,
  ): Promise<Grade[]> {
    return prisma.grade.findMany({
      where: {
        enrollmentId,
        enrollment: { schoolId },
        ...(teacherId ? { entry: { assignment: { teacherId } } } : {}),
      },
      include: {
        entry: {
          include: { assignment: { include: { area: true, classroom: true } } },
        },
        competence: true,
      },
    });
  }

  async createGradeEntry(
    data: CreateGradeEntryDto,
    teacherId?: string,
    schoolId?: string,
  ): Promise<GradeEntry> {
    if (teacherId && schoolId) {
      const assignment = await prisma.courseAssignment.findFirst({
        where: {
          id: data.courseAssignmentId,
          teacherId,
          schoolId,
        },
      });

      if (!assignment) {
        throw new AppError(
          'No tienes permiso para crear evaluaciones en este curso.',
          403,
        );
      }
    }

    return prisma.gradeEntry.create({ data });
  }

  async createGrade(
    data: CreateGradeDto,
    teacherId?: string,
    schoolId?: string,
  ): Promise<Grade> {
    if (teacherId && schoolId) {
      const entry = await prisma.gradeEntry.findFirst({
        where: {
          id: data.gradeEntryId,
          assignment: { teacherId, schoolId },
        },
      });

      if (!entry) {
        throw new AppError(
          'No tienes permiso para registrar esta nota.',
          403,
        );
      }
    }

    return prisma.grade.create({ data });
  }
}
