import { prisma } from '../../config/prisma';
import type { Prisma, EducationLevel, EvaluationCriterion, Grade, GradeEntry } from '@prisma/client';
import type {
  CreateCriterionDto,
  UpdateCriterionDto,
  BatchGradeItemDto,
  BatchSaveConclusionsDto,
  CreateGradeDto,
  CreateGradeEntryDto,
  SyncHomeworkToMatrixDto,
} from './grade.schema';
import { AppError } from '../../core/errors/app-error';
import { SiagieConsolidatorService, letterToScore, scoreToLetter } from './siagie-consolidator.service';
import { thresholdsFromGradingScale, type LetterScaleThresholds } from './letter-scale';
import { type PromotionRuleOverrides } from './promotion-rules';
import { getPeriodDateRange } from '../../utils/period-dates.util';

export type ReportCardEnrollment = Prisma.EnrollmentGetPayload<{
  include: {
    student: {
      include: {
        school: true;
        familyRelations: true;
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
  private letterThresholdCache = new Map<string, { value: LetterScaleThresholds; expiresAt: number }>();

  async getLetterThresholds(schoolId: string, level: EducationLevel): Promise<LetterScaleThresholds> {
    const key = `${schoolId}:${level}`;
    const cached = this.letterThresholdCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    const rows = await prisma.gradingScale.findMany({ where: { schoolId, level }, select: { letterGrade: true, minNumeric: true } });
    const value = thresholdsFromGradingScale(rows);
    this.letterThresholdCache.set(key, { value, expiresAt: Date.now() + 5 * 60 * 1000 });
    return value;
  }

  clearLetterThresholds(schoolId: string): void {
    for (const key of this.letterThresholdCache.keys()) {
      if (key.startsWith(`${schoolId}:`)) this.letterThresholdCache.delete(key);
    }
  }

  async upsertGradingScale(schoolId: string, level: EducationLevel, t: LetterScaleThresholds): Promise<void> {
    const rows = [
      { letterGrade: 'AD', minNumeric: t.AD, maxNumeric: 20 },
      { letterGrade: 'A', minNumeric: t.A, maxNumeric: t.AD - 0.01 },
      { letterGrade: 'B', minNumeric: t.B, maxNumeric: t.A - 0.01 },
      { letterGrade: 'C', minNumeric: 0, maxNumeric: t.B - 0.01 },
    ];
    await prisma.$transaction(
      rows.map((r) =>
        prisma.gradingScale.upsert({
          where: { schoolId_level_letterGrade: { schoolId, level, letterGrade: r.letterGrade } },
          update: { minNumeric: r.minNumeric, maxNumeric: r.maxNumeric },
          create: { schoolId, level, ...r },
        }),
      ),
    );
    this.clearLetterThresholds(schoolId);
  }
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

    // Si el colegio ya tuvo criterios creados previamente, respetar su configuración y no volver a sembrar
    const anyEverCreated = await prisma.evaluationCriterion.findFirst({
      where: { schoolId },
    });
    if (anyEverCreated) {
      return [];
    }

    // Auto-seed de criterios iniciales estándar de colegios particulares
    const defaultCriteria = [
      { name: 'Práctica Mensual', shortName: 'PM', order: 1, weight: 1.0 },
      { name: 'Examen Mensual', shortName: 'EM', order: 2, weight: 1.0 },
      { name: 'Revisión de Cuaderno / Tareas', shortName: 'RC', order: 3, weight: 1.0 },
      { name: 'Examen Bimestral', shortName: 'EB', order: 4, weight: 2.0 },
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
            parentArea: {
              include: {
                competences: true,
              },
            },
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

    // Herencia oficial de competencias CNEB para Sub-cursos (Ramas)
    let effectiveCompetences = assignment.area.competences.filter((c: any) => c.isActive !== false);
    if (assignment.area.parentAreaId && assignment.area.parentArea) {
      const parentComps = (assignment.area.parentArea.competences || []).filter((c: any) => c.isActive !== false);
      const evaluatedIds = assignment.area.evaluatedCompetenceIds || [];
      if (evaluatedIds.length > 0) {
        effectiveCompetences = parentComps.filter((c: any) => evaluatedIds.includes(c.id));
      } else {
        effectiveCompetences = parentComps;
      }
    }
    (assignment.area as any).competences = effectiveCompetences;

    // Conexión 4: Historial de Incidencias dentro del rango de fechas del periodo
    const academicYear = await prisma.academicYear.findFirst({
      where: { schoolId, isActive: true },
    });
    const dateRange = getPeriodDateRange(
      academicYear || {
        startDate: new Date(new Date().getFullYear(), 0, 1),
        endDate: new Date(new Date().getFullYear(), 11, 31),
      },
      periodNumber,
    );

    const enrollmentIds = assignment.classroom.enrollments.map((e) => e.id);
    const incidents = await prisma.studentIncident.findMany({
      where: {
        schoolId,
        enrollmentId: { in: enrollmentIds },
        createdAt: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
      },
      select: {
        enrollmentId: true,
        type: true,
        severity: true,
      },
    });

    const enrichedEnrollments = assignment.classroom.enrollments.map((enr) => {
      const stIncidents = incidents.filter((i) => i.enrollmentId === enr.id);
      const behavioralCount = stIncidents.filter((i) => i.type === 'DEMERITO' || i.type === 'BEHAVIORAL').length;
      const academicCount = stIncidents.filter((i) => i.type === 'MERITO' || i.type === 'ACADEMIC').length;
      const nursingCount = stIncidents.filter((i) => i.type === 'ATENCION_TOPICO' || i.type === 'NURSING').length;
      const citationsCount = stIncidents.filter((i) => i.type === 'CITACION_PADRES' || i.type === 'CITATION').length;

      return {
        ...enr,
        incidentsSummary: {
          total: stIncidents.length,
          behavioralCount,
          academicCount,
          nursingCount,
          citationsCount,
          convivencia: behavioralCount,
          topics: nursingCount,
          totalHighSeverity: stIncidents.filter((i) => i.severity === 'HIGH').length,
        },
      };
    });

    (assignment.classroom as any).enrollments = enrichedEnrollments;

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
        literalScore: true,
        isExonerated: true,
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

    // Regla SIAGIE: Solo registrar calificaciones de estudiantes con matrícula activa y en estado REGISTERED
    const activeEnrollments = await prisma.enrollment.findMany({
      where: {
        id: { in: grades.map((g) => g.enrollmentId) },
        schoolId,
        enrollmentState: 'REGISTERED',
        isActive: true,
      },
      select: { id: true },
    });
    const activeEnrollmentIds = new Set(activeEnrollments.map((e) => e.id));
    const cleanGrades = grades.filter((g) => activeEnrollmentIds.has(g.enrollmentId));

    if (cleanGrades.length === 0) {
      return 0;
    }

    // Ejecución transaccional para garantizar consistencia atómica
    await prisma.$transaction(
      cleanGrades.map((grade) => {
        const isExo = grade.isExonerated === true || grade.literalScore === 'EXO';
        const isHyphen = grade.literalScore === '-';
        let numericScore: number | null = grade.numericScore ?? null;
        let literalScore: string | null = grade.literalScore ?? null;

        if (isExo) {
          numericScore = null;
          literalScore = 'EXO';
        } else if (isHyphen) {
          numericScore = null;
          literalScore = '-';
        } else if (literalScore && (numericScore === null || numericScore === undefined)) {
          const literalToNumeric: Record<string, number> = {
            AD: 19,
            A: 15,
            B: 12,
            C: 8,
          };
          numericScore = literalToNumeric[literalScore] ?? null;
        } else if (numericScore !== null && numericScore !== undefined && !literalScore) {
          if (numericScore >= 17.5) literalScore = 'AD';
          else if (numericScore >= 13.5) literalScore = 'A';
          else if (numericScore >= 10.5) literalScore = 'B';
          else literalScore = 'C';
        }

        return prisma.detailedGrade.upsert({
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
            numericScore,
            literalScore,
            isExonerated: isExo,
            comment: grade.comment ?? null,
          },
          create: {
            schoolId,
            enrollmentId: grade.enrollmentId,
            courseAssignmentId,
            competenceId: grade.competenceId,
            criterionId: grade.criterionId,
            periodNumber,
            numericScore,
            literalScore,
            isExonerated: isExo,
            comment: grade.comment ?? null,
          },
        });
      }),
    );

    return cleanGrades.length;
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
    const gradesMap = new Map<string, Array<{ criterionId: string; numericScore: number | null }>>();
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

      const numericItems = items.filter((it): it is typeof it & { numericScore: number } => it.numericScore !== null && it.numericScore !== undefined);
      if (numericItems.length > 0) {
        const totalWeight = numericItems.reduce(
          (acc, it) => acc + (criteriaWeightMap.get(it.criterionId) || 1),
          0,
        );
        const weightedSum = numericItems.reduce(
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
        enrollmentState: enr.enrollmentState,
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
      include: {
        classroom: {
          select: {
            id: true,
            educationLevel: true,
          },
        },
      },
    });

    if (!assignment) {
      throw new AppError(
        'Asignación de curso no encontrada o no tienes permisos para editarla.',
        404,
      );
    }

    if (teacherId) {
      const isLocked = await this.isPeriodLocked(schoolId, dto.periodNumber, assignment.classroom.id);
      if (isLocked) {
        throw new AppError(
          `El ${dto.periodNumber}° Bimestre se encuentra cerrado y auditado por la Dirección. No se permiten modificaciones.`,
          403,
        );
      }
    }

    // Regla SIAGIE: Solo guardar conclusiones de alumnos con matrícula activa y en estado REGISTERED
    const activeEnrollments = await prisma.enrollment.findMany({
      where: {
        id: { in: dto.conclusions.map((c) => c.enrollmentId) },
        schoolId,
        enrollmentState: 'REGISTERED',
        isActive: true,
      },
      include: {
        student: {
          select: {
            firstNames: true,
            lastNamePaternal: true,
          },
        },
      },
    });

    const activeEnrollmentMap = new Map(activeEnrollments.map((e) => [e.id, e]));

    // Criterios para computar el promedio del alumno en la competencia
    const criteria = await this.findCriteria(schoolId, assignment.classroom.educationLevel);
    const criteriaWeightMap = new Map(criteria.map((c) => [c.id, c.weight || 1]));

    const detailedGrades = await prisma.detailedGrade.findMany({
      where: {
        schoolId,
        courseAssignmentId: dto.courseAssignmentId,
        competenceId: dto.competenceId,
        periodNumber: dto.periodNumber,
        enrollmentId: { in: Array.from(activeEnrollmentMap.keys()) },
      },
      select: {
        enrollmentId: true,
        criterionId: true,
        numericScore: true,
      },
    });

    const gradesByEnrollment = new Map<string, Array<{ criterionId: string; numericScore: number | null }>>();
    detailedGrades.forEach((g) => {
      if (!gradesByEnrollment.has(g.enrollmentId)) {
        gradesByEnrollment.set(g.enrollmentId, []);
      }
      gradesByEnrollment.get(g.enrollmentId)!.push({
        criterionId: g.criterionId,
        numericScore: g.numericScore,
      });
    });

    // Validación normativa RVM N° 094-2020-MINEDU:
    // 1) Si la nota es 'C' (< 10.5), la conclusión es estrictamente obligatoria (mínimo 15 caracteres)
    // 2) En Inicial, la conclusión es obligatoria en todas las competencias evaluadas
    const isInitial = assignment.classroom.educationLevel === 'INITIAL';

    const validItems: Array<{ enrollmentId: string; conclusion: string }> = [];

    for (const item of dto.conclusions) {
      const enr = activeEnrollmentMap.get(item.enrollmentId);
      if (!enr) continue;

      const studentGrades = gradesByEnrollment.get(item.enrollmentId) || [];
      const hasGrades = studentGrades.length > 0;
      let isGradeC = false;

      const numericStudentGrades = studentGrades.filter((it): it is typeof it & { numericScore: number } => it.numericScore !== null && it.numericScore !== undefined);
      if (numericStudentGrades.length > 0) {
        const totalWeight = numericStudentGrades.reduce(
          (acc, it) => acc + (criteriaWeightMap.get(it.criterionId) || 1),
          0,
        );
        const weightedSum = numericStudentGrades.reduce(
          (acc, it) => acc + it.numericScore * (criteriaWeightMap.get(it.criterionId) || 1),
          0,
        );
        const score = totalWeight > 0 ? weightedSum / totalWeight : null;
        isGradeC = score !== null && score < 10.5;
      }

      const cleanText = (item.conclusion || '')
        .replace(/[\r\n\t]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (hasGrades && isGradeC && cleanText.length < 15) {
        throw new AppError(
          `El estudiante ${enr.student.lastNamePaternal} ${enr.student.firstNames} obtuvo calificativo 'C'. La conclusión descriptiva es obligatoria (mínimo 15 caracteres) según la RVM N° 094-2020-MINEDU.`,
          400,
        );
      }

      if (hasGrades && isInitial && cleanText.length < 15) {
        throw new AppError(
          `En Educación Inicial, la conclusión descriptiva es obligatoria (mínimo 15 caracteres) para el estudiante ${enr.student.lastNamePaternal} ${enr.student.firstNames} según la RVM N° 094-2020-MINEDU.`,
          400,
        );
      }

      validItems.push({
        enrollmentId: item.enrollmentId,
        conclusion: cleanText,
      });
    }

    if (validItems.length === 0) {
      return 0;
    }

    await prisma.$transaction(
      validItems.map((item) =>
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

    return validItems.length;
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
            familyRelations: true,
          },
        },
        classroom: {
          include: {
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
  async findSiagieSummary(
    schoolId: string,
    classroomId: string,
    periodNumber: number,
    calculationMode?: 'LAST_PERIOD' | 'AVERAGE',
  ) {
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
                parentArea: {
                  include: {
                    competences: true,
                  },
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

    const academicYear = await prisma.academicYear.findFirst({
      where: { schoolId, isActive: true },
    });
    const effectiveCalculationMode =
      calculationMode || (academicYear?.annualCalculationMode as any) || 'LAST_PERIOD';

    const dateRange = getPeriodDateRange(
      academicYear || {
        startDate: new Date(new Date().getFullYear(), 0, 1),
        endDate: new Date(new Date().getFullYear(), 11, 31),
      },
      periodNumber,
    );

    const periodAttendances = await prisma.attendance.findMany({
      where: {
        schoolId,
        enrollmentId: { in: classroom.enrollments.map((e) => e.id) },
        date: { gte: dateRange.startDate, lte: dateRange.endDate },
      },
      select: {
        enrollmentId: true,
        status: true,
      },
    });

    const registeredEnrollments = classroom.enrollments.filter(
      (e) => e.enrollmentState === 'REGISTERED',
    );
    const totalStudents = classroom.enrollments.length;
    const totalRegisteredStudents = registeredEnrollments.length;

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
        literalScore: true,
        isExonerated: true,
      },
    });

    // Obtener todas las conclusiones descriptivas del aula en el periodo
    const existingConclusions = await prisma.competenceConclusion.findMany({
      where: {
        schoolId,
        courseAssignmentId: { in: assignmentIds },
        periodNumber,
      },
      select: {
        enrollmentId: true,
        courseAssignmentId: true,
        competenceId: true,
        conclusion: true,
      },
    });

    const conclusionsMap = new Map<string, string>();
    existingConclusions.forEach((c) => {
      conclusionsMap.set(
        `${c.enrollmentId}_${c.courseAssignmentId}_${c.competenceId}`,
        c.conclusion,
      );
    });

    // Mapeo en memoria de notas por clave: `${enrollmentId}_${courseAssignmentId}_${competenceId}`
    const gradesMap = new Map<
      string,
      Array<{
        criterionId: string;
        numericScore: number | null;
        literalScore: string | null;
        isExonerated: boolean;
      }>
    >();
    detailedGrades.forEach((g) => {
      const key = `${g.enrollmentId}_${g.courseAssignmentId}_${g.competenceId}`;
      if (!gradesMap.has(key)) {
        gradesMap.set(key, []);
      }
      gradesMap.get(key)!.push({
        criterionId: g.criterionId,
        numericScore: g.numericScore,
        literalScore: g.literalScore,
        isExonerated: g.isExonerated,
      });
    });

    // Resumen por curso para auditoría de avance de docentes con soporte para competencias no trabajadas
    const courseSummaries = classroom.assignments.map((assignment) => {
      let comps = assignment.area.competences;
      if (assignment.area.parentAreaId && assignment.area.parentArea) {
        const parentComps = assignment.area.parentArea.competences || [];
        const evaluatedIds = assignment.area.evaluatedCompetenceIds || [];
        comps = evaluatedIds.length > 0
          ? parentComps.filter((c: any) => evaluatedIds.includes(c.id))
          : parentComps;
      }
      const competenceCount = comps.length;

      let workedCompetenceCount = 0;
      let unworkedCompetenceCount = 0;
      let hasInconsistencies = false;
      let filledGradesCount = 0;

      comps.forEach((comp) => {
        let compStudentCount = 0;
        registeredEnrollments.forEach((enr) => {
          const key = `${enr.id}_${assignment.id}_${comp.id}`;
          const items = gradesMap.get(key) || [];
          if (items.length > 0) {
            compStudentCount++;
            filledGradesCount += items.length;
          }
        });

        if (compStudentCount === 0) {
          unworkedCompetenceCount++;
        } else {
          workedCompetenceCount++;
          if (compStudentCount < totalRegisteredStudents) {
            hasInconsistencies = true;
          }
        }
      });

      const effectiveCompetences =
        workedCompetenceCount > 0 ? workedCompetenceCount : competenceCount;
      const totalExpectedGrades =
        totalRegisteredStudents * effectiveCompetences * criteriaCount;

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
        workedCompetenceCount,
        unworkedCompetenceCount,
        totalExpectedGrades,
        filledGradesCount,
        percentage,
        isComplete: percentage === 100 && !hasInconsistencies,
        hasInconsistencies,
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
      const isInactive =
        enr.enrollmentState === 'WITHDRAWN' || enr.enrollmentState === 'TRANSFERRED';

      const courseGrades: Record<
        string,
        {
          periodScore: number | null;
          letter: 'AD' | 'A' | 'B' | 'C' | 'EXO' | '-' | null;
          competences: Record<
            string,
            { score: number | null; letter: 'AD' | 'A' | 'B' | 'C' | 'EXO' | '-' | null; conclusion: string }
          >;
        }
      > = {};

      const validCourseScores: number[] = [];

      classroom.assignments.forEach((assignment) => {
        let comps = assignment.area.competences;
        if (assignment.area.parentAreaId && assignment.area.parentArea) {
          const parentComps = assignment.area.parentArea.competences || [];
          const evaluatedIds = assignment.area.evaluatedCompetenceIds || [];
          comps = evaluatedIds.length > 0
            ? parentComps.filter((c: any) => evaluatedIds.includes(c.id))
            : parentComps;
        }

        const compGrades: Record<
          string,
          { score: number | null; letter: 'AD' | 'A' | 'B' | 'C' | 'EXO' | '-' | null; conclusion: string }
        > = {};
        const validCompScores: number[] = [];

        comps.forEach((comp) => {
          const key = `${enr.id}_${assignment.id}_${comp.id}`;
          const rawConclusion = conclusionsMap.get(key) || '';

          if (isInactive) {
            compGrades[comp.id] = { score: null, letter: null, conclusion: '' };
            return;
          }

          const items = gradesMap.get(key) || [];
          const isExo = items.some((it) => it.isExonerated || it.literalScore === 'EXO');
          if (isExo) {
            compGrades[comp.id] = { score: null, letter: 'EXO', conclusion: rawConclusion };
            return;
          }

          const isHyphen = items.some((it) => it.literalScore === '-');
          if (isHyphen && items.every((it) => it.literalScore === '-' || it.numericScore === null)) {
            compGrades[comp.id] = { score: null, letter: '-', conclusion: rawConclusion };
            return;
          }

          const numericItems = items.filter(
            (it): it is typeof it & { numericScore: number } =>
              it.numericScore !== null &&
              it.numericScore !== undefined &&
              !it.isExonerated &&
              it.literalScore !== 'EXO' &&
              it.literalScore !== '-',
          );

          if (numericItems.length > 0) {
            const totalWeight = numericItems.reduce(
              (acc, it) => acc + (criteriaWeightMap.get(it.criterionId) || 1),
              0,
            );
            const weightedSum = numericItems.reduce(
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
            compGrades[comp.id] = { score, letter, conclusion: rawConclusion };
            if (score !== null) validCompScores.push(score);
          } else {
            compGrades[comp.id] = { score: null, letter: null, conclusion: rawConclusion };
          }
        });

        const periodScore =
          !isInactive && validCompScores.length > 0
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
        !isInactive && validCourseScores.length > 0
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

      const stAtts = periodAttendances.filter((a) => a.enrollmentId === enr.id);
      const attendanceStats = {
        absentJustified: stAtts.filter((a) => a.status === 'ABSENT_JUSTIFIED').length,
        absentUnjustified: stAtts.filter((a) => a.status === 'ABSENT_UNJUSTIFIED').length,
        lateJustified: stAtts.filter((a) => a.status === 'LATE_JUSTIFIED').length,
        lateUnjustified: stAtts.filter((a) => a.status === 'LATE_UNJUSTIFIED').length,
      };

      return {
        enrollmentId: enr.id,
        enrollmentState: enr.enrollmentState,
        orderIndex: idx + 1,
        documentId: student.documentId,
        studentCode: student.studentCode,
        fullName,
        lastNamePaternal: student.lastNamePaternal,
        lastNameMaternal: student.lastNameMaternal || '',
        firstNames: student.firstNames,
        courseGrades,
        generalScore,
        generalLetter,
        attendanceStats,
      };
    });

    const coursesMatrix = classroom.assignments.map((a) => {
      let comps = a.area.competences;
      if (a.area.parentAreaId && a.area.parentArea) {
        const parentComps = a.area.parentArea.competences || [];
        const evaluatedIds = a.area.evaluatedCompetenceIds || [];
        comps = evaluatedIds.length > 0
          ? parentComps.filter((c: any) => evaluatedIds.includes(c.id))
          : parentComps;
      }
      return {
        id: a.id,
        name: a.area.name,
        officialCode: a.area.officialCode,
        teacherName: `Prof. ${a.teacher.firstName} ${a.teacher.lastNamePaternal}`,
        competences: comps.map((c) => ({
          id: c.id,
          name: c.name,
        })),
      };
    });

    const coursesInfo = classroom.assignments.map((a) => {
      let comps = a.area.competences;
      if (a.area.parentAreaId && a.area.parentArea) {
        const parentComps = a.area.parentArea.competences || [];
        const evaluatedIds = a.area.evaluatedCompetenceIds || [];
        comps = evaluatedIds.length > 0
          ? parentComps.filter((c: any) => evaluatedIds.includes(c.id))
          : parentComps;
      }
      return {
        assignmentId: a.id,
        name: a.area.name,
        officialCode: a.area.officialCode,
        officialAreaCode: a.area.officialAreaCode,
        parentAreaId: a.area.parentAreaId,
        parentArea: a.area.parentArea,
        evaluatedCompetenceIds: a.area.evaluatedCompetenceIds || [],
        teacherName: `Prof. ${a.teacher.firstName} ${a.teacher.lastNamePaternal}`,
        competences: comps.map((c) => ({
          id: c.id,
          name: c.name,
          officialCompetenceCode: c.officialCompetenceCode,
        })),
      };
    });

    const thresholds = await this.getLetterThresholds(schoolId, classroom.educationLevel);

    const { consolidatedAreas, consolidatedStudents, unmappedCompetences } =
      SiagieConsolidatorService.consolidateClassroom(
        coursesInfo,
        students,
        {
          educationLevel: classroom.educationLevel,
          grade: classroom.grade,
          annualCalculationMode: effectiveCalculationMode,
          periodNumber,
        },
        thresholds,
        academicYear?.promotionRulesConfig as PromotionRuleOverrides | null,
      );

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
      calculationMode: effectiveCalculationMode,
      overallPercentage,
      courses: courseSummaries,
      unmappedCompetences,
      matrix: {
        courses: coursesMatrix,
        students: consolidatedStudents,
        consolidatedAreas,
      },
    };
  }

  /**
   * Conexión 1: Sincroniza tareas calificadas del Aula Virtual hacia la Matriz de Notas
   */
  async syncHomeworkToMatrix(
    schoolId: string,
    dto: SyncHomeworkToMatrixDto,
    teacherId?: string,
  ): Promise<{ updatedStudentsCount: number; totalHomeworksFound: number }> {
    const assignment = await prisma.courseAssignment.findFirst({
      where: {
        id: dto.courseAssignmentId,
        schoolId,
        ...(teacherId ? { teacherId } : {}),
      },
      include: {
        area: {
          include: {
            competences: true,
            parentArea: {
              include: { competences: true },
            },
          },
        },
        classroom: {
          include: {
            enrollments: {
              where: { schoolId, isActive: true },
            },
          },
        },
      },
    });

    if (!assignment) {
      throw new AppError('Asignación de curso no encontrada o no tienes permisos.', 404);
    }

    if (teacherId) {
      const isLocked = await this.isPeriodLocked(schoolId, dto.periodNumber, assignment.classroomId);
      if (isLocked) {
        throw new AppError(
          `El ${dto.periodNumber}° Periodo se encuentra cerrado y auditado por Dirección.`,
          403,
        );
      }
    }

    let effectiveCriterionId = dto.criterionId || dto.targetCriterionId;
    if (!effectiveCriterionId) {
      const defaultCrit = await prisma.evaluationCriterion.findFirst({
        where: {
          schoolId,
          educationLevel: assignment.classroom.educationLevel,
          isActive: true,
          OR: [
            { shortName: 'TAREAS' },
            { name: { contains: 'Tarea', mode: 'insensitive' } },
            { shortName: 'PC' },
          ],
        },
      });
      effectiveCriterionId = defaultCrit?.id;
    }

    if (!effectiveCriterionId) {
      throw new AppError('No se encontró un criterio de evaluación para asociar las tareas.', 400);
    }

    const requestedCompId = dto.competenceId || dto.targetCompetenceId;
    let targetCompIds: string[] = [];

    if (requestedCompId) {
      targetCompIds = [requestedCompId];
    } else {
      if (assignment.area.parentAreaId && assignment.area.parentArea?.competences) {
        const comps =
          assignment.area.evaluatedCompetenceIds && assignment.area.evaluatedCompetenceIds.length > 0
            ? assignment.area.parentArea.competences.filter((c) =>
                assignment.area.evaluatedCompetenceIds.includes(c.id),
              )
            : assignment.area.parentArea.competences;
        targetCompIds = comps.map((c) => c.id);
      } else {
        targetCompIds = assignment.area.competences.map((c) => c.id);
      }
    }

    if (targetCompIds.length === 0) {
      throw new AppError('El curso no tiene competencias configuradas para asociar la nota.', 400);
    }

    let homeworkWhere: any = {
      schoolId,
      courseAssignmentId: dto.courseAssignmentId,
      contentType: 'HOMEWORK',
      bimester: dto.periodNumber,
    };
    if (dto.homeworkId) {
      homeworkWhere = {
        schoolId,
        id: dto.homeworkId,
        courseAssignmentId: dto.courseAssignmentId,
      };
    }

    const homeworkContents = await prisma.courseContent.findMany({
      where: homeworkWhere,
      select: { id: true },
    });

    const contentIds = homeworkContents.map((h) => h.id);
    if (contentIds.length === 0) {
      return { updatedStudentsCount: 0, totalHomeworksFound: 0 };
    }

    const activeEnrollmentIds = assignment.classroom.enrollments.map((e) => e.id);
    const submissions = await prisma.homeworkSubmission.findMany({
      where: {
        schoolId,
        courseContentId: { in: contentIds },
        enrollmentId: { in: activeEnrollmentIds },
        OR: [{ numericScore: { not: null } }, { literalScore: { not: null } }],
      },
      select: {
        enrollmentId: true,
        numericScore: true,
        literalScore: true,
      },
    });

    const studentGradesMap = new Map<string, number[]>();
    submissions.forEach((sub) => {
      let score = sub.numericScore;
      if (score === null && sub.literalScore) {
        score = letterToScore(sub.literalScore);
      }
      if (score !== null && score !== undefined && !isNaN(score)) {
        if (!studentGradesMap.has(sub.enrollmentId)) {
          studentGradesMap.set(sub.enrollmentId, []);
        }
        studentGradesMap.get(sub.enrollmentId)!.push(score);
      }
    });

    let updatedStudentsCount = 0;
    const upsertPromises: any[] = [];

    studentGradesMap.forEach((scores, enrollmentId) => {
      if (scores.length > 0) {
        const avg = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
        const literal = scoreToLetter(avg);

        for (const compId of targetCompIds) {
          upsertPromises.push(
            prisma.detailedGrade.upsert({
              where: {
                enrollmentId_courseAssignmentId_competenceId_criterionId_periodNumber: {
                  enrollmentId,
                  courseAssignmentId: dto.courseAssignmentId,
                  competenceId: compId,
                  criterionId: effectiveCriterionId!,
                  periodNumber: dto.periodNumber,
                },
              },
              update: {
                numericScore: avg,
                literalScore: literal,
                comment: `Sincronizado de ${scores.length} tarea(s) del Aula Virtual`,
              },
              create: {
                schoolId,
                enrollmentId,
                courseAssignmentId: dto.courseAssignmentId,
                competenceId: compId,
                criterionId: effectiveCriterionId!,
                periodNumber: dto.periodNumber,
                numericScore: avg,
                literalScore: literal,
                comment: `Sincronizado de ${scores.length} tarea(s) del Aula Virtual`,
              },
            }),
          );
        }
        updatedStudentsCount++;
      }
    });

    if (upsertPromises.length > 0) {
      await prisma.$transaction(upsertPromises);
    }

    return {
      updatedStudentsCount,
      totalHomeworksFound: contentIds.length,
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
