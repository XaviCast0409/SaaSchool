import type { GradeRepository, ReportCardEnrollment } from './grade.repository';
import { AppError } from '../../core/errors/app-error';
import type {
  CreateCriterionDto,
  UpdateCriterionDto,
  BatchSaveGradesDto,
  GetConclusionsQueryDto,
  BatchSaveConclusionsDto,
  TogglePeriodLockDto,
  CreateGradeDto,
  CreateGradeEntryDto,
  SyncHomeworkToMatrixDto,
} from './grade.schema';
import type { EducationLevel, EvaluationCriterion, Grade, GradeEntry } from '@prisma/client';
import { getPeriodDateRange } from '../../utils/period-dates.util';

export interface UserContext {
  userId: string;
  schoolId: string;
  role: string;
}

export interface SiagieGradeConversion {
  numeric: number | null;
  letter: 'AD' | 'A' | 'B' | 'C' | 'EXO';
  label: string;
}

export function convertScoreToSiagie(score: number): SiagieGradeConversion {
  const rounded = Math.round(score * 10) / 10;
  if (rounded >= 17.5) {
    return { numeric: rounded, letter: 'AD', label: 'Logro Destacado' };
  }
  if (rounded >= 13.5) {
    return { numeric: rounded, letter: 'A', label: 'Logro Esperado' };
  }
  if (rounded >= 10.5) {
    return { numeric: rounded, letter: 'B', label: 'En Proceso' };
  }
  return { numeric: rounded, letter: 'C', label: 'En Inicio' };
}

export class GradeService {
  constructor(private readonly gradeRepository: GradeRepository) {}

  // ============================================================================
  // Criterios / Rubros Evaluativos
  // ============================================================================

  async getCriteria(schoolId: string, level?: EducationLevel): Promise<EvaluationCriterion[]> {
    return this.gradeRepository.findCriteria(schoolId, level);
  }

  async createCriterion(schoolId: string, dto: CreateCriterionDto): Promise<EvaluationCriterion> {
    return this.gradeRepository.createCriterion(schoolId, dto);
  }

  async updateCriterion(
    schoolId: string,
    id: string,
    dto: UpdateCriterionDto,
  ): Promise<EvaluationCriterion> {
    return this.gradeRepository.updateCriterion(schoolId, id, dto);
  }

  async deleteCriterion(schoolId: string, id: string): Promise<void> {
    return this.gradeRepository.deleteCriterion(schoolId, id);
  }

  // ============================================================================
  // Matriz de Calificaciones (Cubicol / Excel)
  // ============================================================================

  async getMatrixData(
    schoolId: string,
    courseAssignmentId: string,
    periodNumber: number,
    userContext: UserContext,
  ) {
    const isTeacher = userContext.role === 'TEACHER';
    return this.gradeRepository.findCourseMatrixData(
      schoolId,
      courseAssignmentId,
      periodNumber,
      isTeacher ? userContext.userId : undefined,
    );
  }

  async saveBatchGrades(
    schoolId: string,
    dto: BatchSaveGradesDto,
    userContext: UserContext,
  ): Promise<{ savedCount: number; message: string }> {
    const isTeacher = userContext.role === 'TEACHER';
    const count = await this.gradeRepository.batchUpsertDetailedGrades(
      schoolId,
      dto.courseAssignmentId,
      dto.periodNumber,
      dto.grades,
      isTeacher ? userContext.userId : undefined,
    );

    return {
      savedCount: count,
      message: `Se guardaron ${count} calificaciones correctamente.`,
    };
  }

  // ============================================================================
  // Conclusiones Descriptivas por Competencia
  // ============================================================================

  async getConclusions(
    schoolId: string,
    query: GetConclusionsQueryDto,
    userContext: UserContext,
  ) {
    const isTeacher = userContext.role === 'TEACHER';
    return this.gradeRepository.findCompetenceConclusions(
      schoolId,
      query.courseAssignmentId,
      query.periodNumber,
      query.competenceId,
      isTeacher ? userContext.userId : undefined,
    );
  }

  async saveBatchConclusions(
    schoolId: string,
    dto: BatchSaveConclusionsDto,
    userContext: UserContext,
  ) {
    const isTeacher = userContext.role === 'TEACHER';
    const count = await this.gradeRepository.batchUpsertCompetenceConclusions(
      schoolId,
      dto,
      isTeacher ? userContext.userId : undefined,
    );

    return {
      savedCount: count,
      message: `Se guardaron ${count} conclusiones descriptivas correctamente.`,
    };
  }

  // ============================================================================
  // Libreta de Notas / Report Card en PDF
  // ============================================================================

  async getReportCard(
    schoolId: string,
    enrollmentId: string,
    userContext?: { userId: string; role: string; studentId?: string },
  ) {
    const rawData: ReportCardEnrollment =
      await this.gradeRepository.findReportCardByEnrollment(schoolId, enrollmentId);

    // Verificación de permisos (IDOR)
    if (userContext?.role === 'STUDENT') {
      const currentStudentId = userContext.studentId || userContext.userId;
      if (rawData.studentId !== currentStudentId) {
        throw new AppError('No tienes permisos para ver esta libreta de notas.', 403);
      }
    } else if (userContext?.role === 'PARENT') {
      const isParent = (rawData.student.familyRelations || []).some(
        (rel) => rel.userId === userContext.userId,
      );
      if (!isParent) {
        throw new AppError('No tienes permisos para ver esta libreta de notas.', 403);
      }
    }

    // Calcular estadísticas de asistencia
    const attendances = rawData.attendances || [];
    const attendanceStats = {
      present: attendances.filter((a) => a.status === 'PRESENT').length,
      lateJustified: attendances.filter((a) => a.status === 'LATE_JUSTIFIED').length,
      lateUnjustified: attendances.filter((a) => a.status === 'LATE_UNJUSTIFIED').length,
      absentJustified: attendances.filter((a) => a.status === 'ABSENT_JUSTIFIED').length,
      absentUnjustified: attendances.filter((a) => a.status === 'ABSENT_UNJUSTIFIED').length,
      totalRegisteredDays: attendances.length,
    };

    const periodType = rawData.academicYear?.periodType || 'BIMESTER';
    const periodNumbers = periodType === 'TRIMESTER' ? [1, 2, 3] : [1, 2, 3, 4];

    // Conexión 2: Contadores exactos de asistencia oficial SIAGIE (IJ, II, TJ, TI) por periodo
    const periodAttendanceStats = periodNumbers.map((pNum) => {
      const range = getPeriodDateRange(rawData.academicYear, pNum);
      const filtered = attendances.filter((a) => {
        const d = new Date(a.date);
        return d >= range.startDate && d <= range.endDate;
      });
      return {
        periodNumber: pNum,
        present: filtered.filter((a) => a.status === 'PRESENT').length,
        lateJustified: filtered.filter((a) => a.status === 'LATE_JUSTIFIED').length,
        lateUnjustified: filtered.filter((a) => a.status === 'LATE_UNJUSTIFIED').length,
        absentJustified: filtered.filter((a) => a.status === 'ABSENT_JUSTIFIED').length,
        absentUnjustified: filtered.filter((a) => a.status === 'ABSENT_UNJUSTIFIED').length,
        totalRegisteredDays: filtered.length,
      };
    });

    // Procesar notas por curso y periodos
    const courses = (rawData.classroom?.assignments || []).map((assignment) => {
      const area = assignment.area;
      const competences = (area.competences || []).filter((c) => (c as any).isActive !== false);

      // Periodos dinámicos
      const periods = periodNumbers.map((periodNumber) => {
        // Notas del curso en este periodo
        const periodGrades = rawData.detailedGrades.filter(
          (g) => g.courseAssignmentId === assignment.id && g.periodNumber === periodNumber,
        );

        // Promedio y conclusiones de cada competencia en este periodo
        const periodConclusions = rawData.competenceConclusions || [];

        const competenceAverages = competences.map((comp) => {
          const compGrades = periodGrades.filter((g) => g.competenceId === comp.id);
          const isExo = compGrades.some((g) => g.isExonerated || g.literalScore === 'EXO');
          const conclusionObj = periodConclusions.find(
            (c) =>
              c.courseAssignmentId === assignment.id &&
              c.competenceId === comp.id &&
              c.periodNumber === periodNumber,
          );

          if (isExo) {
            return {
              competenceId: comp.id,
              competenceName: comp.name,
              score: null,
              siagie: { numeric: null, letter: 'EXO' as const, label: 'Exonerado' },
              isExonerated: true,
              conclusion: conclusionObj?.conclusion || null,
            };
          }

          const compGradesWithNumeric = compGrades.filter(
            (g): g is typeof g & { numericScore: number } => g.numericScore !== null && g.numericScore !== undefined,
          );
          const totalWeight = compGradesWithNumeric.reduce((acc, g) => acc + (g.criterion?.weight || 1), 0);
          const weightedSum = compGradesWithNumeric.reduce(
            (acc, g) => acc + g.numericScore * (g.criterion?.weight || 1),
            0,
          );
          const score = totalWeight > 0 ? weightedSum / totalWeight : null;

          return {
            competenceId: comp.id,
            competenceName: comp.name,
            score,
            siagie: score !== null ? convertScoreToSiagie(score) : null,
            isExonerated: false,
            conclusion: conclusionObj?.conclusion || null,
          };
        });

        // Promedio del curso en el bimestre
        const validCompScores = competenceAverages
          .map((c) => c.score)
          .filter((s): s is number => s !== null);

        const periodScore =
          validCompScores.length > 0
            ? validCompScores.reduce((a, b) => a + b, 0) / validCompScores.length
            : null;

        return {
          periodNumber,
          periodScore: periodScore !== null ? Math.round(periodScore * 10) / 10 : null,
          siagie: periodScore !== null ? convertScoreToSiagie(periodScore) : null,
          competences: competenceAverages,
        };
      });

      // Promedio Anual del Curso
      const validPeriodScores = periods
        .map((p) => p.periodScore)
        .filter((s): s is number => s !== null);

      const annualScore =
        validPeriodScores.length > 0
          ? validPeriodScores.reduce((a, b) => a + b, 0) / validPeriodScores.length
          : null;

      return {
        assignmentId: assignment.id,
        areaName: area.name,
        officialCode: area.officialCode,
        teacherName: `Prof. ${assignment.teacher.firstName} ${assignment.teacher.lastNamePaternal}`,
        periods,
        annualScore: annualScore !== null ? Math.round(annualScore * 10) / 10 : null,
        annualSiagie: annualScore !== null ? convertScoreToSiagie(annualScore) : null,
      };
    });

    // Promedio General Anual de todos los cursos
    const validAnnualScores = courses
      .map((c) => c.annualScore)
      .filter((s): s is number => s !== null);

    const generalAnnualAverage =
      validAnnualScores.length > 0
        ? Math.round(
            (validAnnualScores.reduce((a, b) => a + b, 0) / validAnnualScores.length) * 10,
          ) / 10
        : null;

    return {
      school: {
        name: rawData.student.school.name,
        modularCode: rawData.student.school.modularCode,
        documentId: rawData.student.school.documentId,
        address: rawData.student.school.address,
        logoUrl: rawData.student.school.logoUrl,
      },
      student: {
        fullName: `${rawData.student.lastNamePaternal} ${rawData.student.lastNameMaternal || ''}, ${rawData.student.firstNames}`.trim(),
        studentCode: rawData.student.studentCode,
        documentId: rawData.student.documentId,
      },
      classroom: {
        grade: rawData.classroom.grade,
        section: rawData.classroom.section,
        educationLevel: rawData.classroom.educationLevel,
        shift: rawData.classroom.shift,
        tutorTeacher: (rawData.classroom as any).tutorTeacher
          ? {
              id: (rawData.classroom as any).tutorTeacher.id,
              fullName: `Prof. ${(rawData.classroom as any).tutorTeacher.firstName} ${(rawData.classroom as any).tutorTeacher.lastNamePaternal}`,
            }
          : null,
      },
      academicYear: rawData.academicYear.year,
      periodType,
      attendanceStats,
      periodAttendanceStats,
      courses,
      generalAnnualAverage,
      generalAnnualSiagie:
        generalAnnualAverage !== null ? convertScoreToSiagie(generalAnnualAverage) : null,
    };
  }

  // ============================================================================
  // Consolidado SIAGIE
  // ============================================================================

  async getSiagieSummary(
    schoolId: string,
    classroomId: string,
    periodNumber: number,
    calculationMode?: 'LAST_PERIOD' | 'AVERAGE',
  ) {
    return this.gradeRepository.findSiagieSummary(
      schoolId,
      classroomId,
      periodNumber,
      calculationMode,
    );
  }

  // ============================================================================
  // Conexión 1: Sincronización de Tareas LMS hacia la Matriz de Notas
  // ============================================================================

  async syncHomeworkToMatrix(
    schoolId: string,
    userContext: UserContext,
    dto: SyncHomeworkToMatrixDto,
  ) {
    const isTeacher = userContext.role === 'TEACHER';
    return this.gradeRepository.syncHomeworkToMatrix(
      schoolId,
      dto,
      isTeacher ? userContext.userId : undefined,
    );
  }

  // ============================================================================
  // Cierre y Bloqueo de Periodos / Actas (Dirección)
  // ============================================================================

  async getPeriodLockStatus(schoolId: string, periodNumber: number, classroomId?: string) {
    return this.gradeRepository.findPeriodLock(schoolId, periodNumber, classroomId);
  }

  async togglePeriodLock(
    schoolId: string,
    dto: TogglePeriodLockDto,
    userContext: UserContext,
  ) {
    return this.gradeRepository.togglePeriodLock(
      schoolId,
      dto.periodNumber,
      dto.isLocked,
      userContext.userId,
      dto.classroomId,
      dto.reason,
    );
  }

  // ============================================================================
  // Métodos Legacy
  // ============================================================================

  async getGradesByEnrollment(
    enrollmentId: string,
    schoolId: string,
    userContext: UserContext,
  ): Promise<Grade[]> {
    const isTeacher = userContext.role === 'TEACHER';
    return this.gradeRepository.findGradesByEnrollment(
      enrollmentId,
      schoolId,
      isTeacher ? userContext.userId : undefined,
    );
  }

  async createGradeEntry(
    dto: CreateGradeEntryDto,
    userContext: UserContext,
  ): Promise<GradeEntry> {
    const isTeacher = userContext.role === 'TEACHER';
    return this.gradeRepository.createGradeEntry(
      dto,
      isTeacher ? userContext.userId : undefined,
      isTeacher ? userContext.schoolId : undefined,
    );
  }

  async createGrade(
    dto: CreateGradeDto,
    userContext: UserContext,
  ): Promise<Grade> {
    const isTeacher = userContext.role === 'TEACHER';
    return this.gradeRepository.createGrade(
      dto,
      isTeacher ? userContext.userId : undefined,
      isTeacher ? userContext.schoolId : undefined,
    );
  }

  async getGradingScale(schoolId: string, level: EducationLevel) {
    return this.gradeRepository.getLetterThresholds(schoolId, level);
  }

  async updateGradingScale(schoolId: string, level: EducationLevel, thresholds: { AD: number; A: number; B: number }) {
    await this.gradeRepository.upsertGradingScale(schoolId, level, thresholds);
    return this.gradeRepository.getLetterThresholds(schoolId, level);
  }
}
