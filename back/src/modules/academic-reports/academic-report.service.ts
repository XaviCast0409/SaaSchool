import { AcademicReportRepository } from './academic-report.repository';
import { EducationLevel } from '@prisma/client';

export class AcademicReportService {
  constructor(private readonly academicReportRepository: AcademicReportRepository) {}

  /**
   * Catálogo de Aulas activas para los selectores de reportes.
   */
  async getAvailableClassrooms(schoolId: string, academicYearId?: string) {
    return this.academicReportRepository.findAvailableClassrooms(schoolId, academicYearId);
  }

  /**
   * Reporte 0021: Consolidado de Estudios (Matriz de Calificaciones).
   */
  async getConsolidatedGrades(schoolId: string, classroomId: string, periodNumber: number) {
    const raw = await this.academicReportRepository.findConsolidatedGradesRaw(
      schoolId,
      classroomId,
      periodNumber,
    );

    const { classroom, criteria, detailedGrades, attendances } = raw;
    const criteriaWeightMap = new Map(criteria.map((c) => [c.id, c.weight || 1]));

    // Mapeo en memoria de notas por clave: `${enrollmentId}_${courseAssignmentId}_${competenceId}`
    const gradesMap = new Map<string, Array<{ criterionId: string; numericScore: number; shortName?: string }>>();
    detailedGrades.forEach((gradeItem) => {
      const key = `${gradeItem.enrollmentId}_${gradeItem.courseAssignmentId}_${gradeItem.competenceId}`;
      if (!gradesMap.has(key)) {
        gradesMap.set(key, []);
      }
      gradesMap.get(key)!.push({
        criterionId: gradeItem.criterionId,
        numericScore: gradeItem.numericScore,
        shortName: gradeItem.criterion?.shortName,
      });
    });

    // Mapeo de asistencia por enrollmentId
    const attendanceMap = new Map<
      string,
      { lateUnjustified: number; lateJustified: number; absentUnjustified: number; absentJustified: number }
    >();

    attendances.forEach((record) => {
      if (!attendanceMap.has(record.enrollmentId)) {
        attendanceMap.set(record.enrollmentId, {
          lateUnjustified: 0,
          lateJustified: 0,
          absentUnjustified: 0,
          absentJustified: 0,
        });
      }
      const item = attendanceMap.get(record.enrollmentId)!;
      if (record.status === 'LATE_UNJUSTIFIED') item.lateUnjustified++;
      else if (record.status === 'LATE_JUSTIFIED') item.lateJustified++;
      else if (record.status === 'ABSENT_UNJUSTIFIED') item.absentUnjustified++;
      else if (record.status === 'ABSENT_JUSTIFIED') item.absentJustified++;
    });

    // Procesar cada alumno
    const studentsCalculated = classroom.enrollments.map((enr, index) => {
      const student = enr.student;
      const fullName = `${student.lastNamePaternal} ${student.lastNameMaternal || ''}, ${student.firstNames}`.trim();

      const courseScores: Record<string, number | null> = {};
      const validScores: number[] = [];
      let conductScore: number | null = null;

      classroom.assignments.forEach((assignment) => {
        const competenceScores: number[] = [];

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
            const compScore = totalWeight > 0 ? weightedSum / totalWeight : null;
            if (compScore !== null) {
              competenceScores.push(compScore);
            }

            // Buscar si alguno corresponde al rubro de Conducta (COND)
            const condItem = items.find((it) => it.shortName === 'COND');
            if (condItem && conductScore === null) {
              conductScore = condItem.numericScore;
            }
          }
        });

        // Promedio bimestral del curso
        const periodScore =
          competenceScores.length > 0
            ? Math.round(
                (competenceScores.reduce((a, b) => a + b, 0) / competenceScores.length) * 10,
              ) / 10
            : null;

        courseScores[assignment.id] = periodScore;
        if (periodScore !== null) {
          validScores.push(periodScore);
        }
      });

      // Cálculo de Promedio y Puntaje
      const generalAverage =
        validScores.length > 0
          ? Math.round(
              (validScores.reduce((a, b) => a + b, 0) / validScores.length) * 100,
            ) / 100
          : null;

      const totalPoints =
        validScores.length > 0
          ? Math.round(validScores.reduce((a, b) => a + b, 0))
          : 0;

      const failedCoursesCount = validScores.filter((score) => score < 10.5).length;

      const attendanceRecord = attendanceMap.get(enr.id) || {
        lateUnjustified: 0,
        lateJustified: 0,
        absentUnjustified: 0,
        absentJustified: 0,
      };

      return {
        enrollmentId: enr.id,
        orderIndex: index + 1,
        studentId: student.id,
        studentCode: student.studentCode,
        documentId: student.documentId,
        fullName,
        gender: student.gender,
        courseScores,
        conduct: conductScore !== null ? Math.round(conductScore) : 20,
        average: generalAverage,
        points: totalPoints,
        failedCoursesCount,
        hasNoGrades: validScores.length === 0,
        attendance: attendanceRecord,
      };
    });

    // Asignación de Orden de Mérito y Tercios
    const evaluatedStudents = studentsCalculated.filter((s) => !s.hasNoGrades);
    evaluatedStudents.sort((a, b) => {
      const avgA = a.average ?? 0;
      const avgB = b.average ?? 0;
      if (avgB !== avgA) return avgB - avgA;
      if (b.points !== a.points) return b.points - a.points;
      return a.fullName.localeCompare(b.fullName);
    });

    const totalEvaluated = evaluatedStudents.length;
    const thirdSize = Math.ceil(totalEvaluated / 3);

    const meritMap = new Map<string, { rank: number; tercio: 'SUP' | 'MED' | 'INF' }>();
    evaluatedStudents.forEach((student, rankIdx) => {
      // Determinación de tercio escolar
      let tercio: 'SUP' | 'MED' | 'INF' = 'INF';
      if (rankIdx < thirdSize) {
        tercio = 'SUP';
      } else if (rankIdx < thirdSize * 2) {
        tercio = 'MED';
      }

      meritMap.set(student.enrollmentId, {
        rank: rankIdx + 1,
        tercio,
      });
    });

    // Resolver empates en orden de mérito
    for (let i = 1; i < evaluatedStudents.length; i++) {
      const prev = evaluatedStudents[i - 1];
      const curr = evaluatedStudents[i];
      if (prev.average === curr.average && prev.points === curr.points) {
        const prevRank = meritMap.get(prev.enrollmentId)?.rank || i;
        const currTercio = meritMap.get(curr.enrollmentId)?.tercio || 'INF';
        meritMap.set(curr.enrollmentId, { rank: prevRank, tercio: currTercio });
      }
    }

    const studentsWithMerit = studentsCalculated.map((s) => {
      const merit = meritMap.get(s.enrollmentId);
      return {
        ...s,
        meritOrder: merit?.rank ?? null,
        tercio: merit?.tercio ?? null,
      };
    });

    // Estadísticas al pie por cada curso
    const courseStats: Record<
      string,
      {
        average: number | null;
        approvedCount: number;
        failedCount: number;
        approvedPercent: number;
        failedPercent: number;
        maxScore: number | null;
        minScore: number | null;
      }
    > = {};

    classroom.assignments.forEach((assignment) => {
      const scores = studentsCalculated
        .map((s) => s.courseScores[assignment.id])
        .filter((sc): sc is number => sc !== null);

      if (scores.length > 0) {
        const sum = scores.reduce((a, b) => a + b, 0);
        const avg = Math.round((sum / scores.length) * 10) / 10;
        const approved = scores.filter((sc) => sc >= 10.5).length;
        const failed = scores.filter((sc) => sc < 10.5).length;

        courseStats[assignment.id] = {
          average: avg,
          approvedCount: approved,
          failedCount: failed,
          approvedPercent: Math.round((approved / scores.length) * 100),
          failedPercent: Math.round((failed / scores.length) * 100),
          maxScore: Math.max(...scores),
          minScore: Math.min(...scores),
        };
      } else {
        courseStats[assignment.id] = {
          average: null,
          approvedCount: 0,
          failedCount: 0,
          approvedPercent: 0,
          failedPercent: 0,
          maxScore: null,
          minScore: null,
        };
      }
    });

    // Totales de asistencias del aula
    const totalAttendances = {
      lateUnjustified: studentsCalculated.reduce((acc, s) => acc + s.attendance.lateUnjustified, 0),
      lateJustified: studentsCalculated.reduce((acc, s) => acc + s.attendance.lateJustified, 0),
      absentUnjustified: studentsCalculated.reduce((acc, s) => acc + s.attendance.absentUnjustified, 0),
      absentJustified: studentsCalculated.reduce((acc, s) => acc + s.attendance.absentJustified, 0),
    };

    return {
      school: classroom.school,
      classroom: {
        id: classroom.id,
        grade: classroom.grade,
        section: classroom.section,
        educationLevel: classroom.educationLevel,
        shift: classroom.shift,
        tutorTeacher: classroom.tutorTeacher
          ? `${classroom.tutorTeacher.lastNamePaternal} ${classroom.tutorTeacher.lastNameMaternal || ''}, ${classroom.tutorTeacher.firstName}`.trim()
          : 'Sin tutor asignado',
      },
      periodNumber,
      courses: classroom.assignments.map((a) => ({
        id: a.id,
        name: a.area.name,
        officialCode: a.area.officialCode,
        teacherName: `${a.teacher.lastNamePaternal} ${a.teacher.firstName}`.trim(),
      })),
      students: studentsWithMerit,
      courseStats,
      totalAttendances,
      totalStudents: studentsCalculated.length,
      reportCode: '0021',
    };
  }

  /**
   * Reporte 0048: Orden de Mérito y Tercios por Salón.
   */
  async getMeritClassroom(schoolId: string, classroomId: string, periodNumber: number) {
    const consolidated = await this.getConsolidatedGrades(schoolId, classroomId, periodNumber);

    // Filtrar y ordenar según mérito
    const rankedStudents = [...consolidated.students]
      .filter((s) => s.meritOrder !== null)
      .sort((a, b) => (a.meritOrder || 999) - (b.meritOrder || 999));

    const totalStudents = consolidated.students.length;
    const invictosCount = consolidated.students.filter((s) => s.failedCoursesCount === 0 && !s.hasNoGrades).length;
    const withFailedCount = consolidated.students.filter((s) => s.failedCoursesCount > 0).length;
    const withNoGradesCount = consolidated.students.filter((s) => s.hasNoGrades).length;

    // Estadísticas de Tercios
    const tercioSuperiorStudents = rankedStudents.filter((s) => s.tercio === 'SUP');
    const tercioMedioStudents = rankedStudents.filter((s) => s.tercio === 'MED');
    const tercioInferiorStudents = rankedStudents.filter((s) => s.tercio === 'INF');

    const calculateTercioRow = (studentsInTercio: typeof rankedStudents) => {
      const count = studentsInTercio.length;
      if (count === 0) {
        return { total: 0, percent: 0, initialScore: 0, finalScore: 0, average: 0 };
      }
      const averages = studentsInTercio.map((s) => s.average || 0);
      return {
        total: count,
        percent: Math.round((count / totalStudents) * 1000) / 10,
        initialScore: Math.max(...averages),
        finalScore: Math.min(...averages),
        average: Math.round((averages.reduce((a, b) => a + b, 0) / count) * 100) / 100,
      };
    };

    const validAverages = rankedStudents.map((s) => s.average || 0);
    const classroomAverage =
      validAverages.length > 0
        ? Math.round((validAverages.reduce((a, b) => a + b, 0) / validAverages.length) * 100) / 100
        : 0;

    return {
      school: consolidated.school,
      classroom: consolidated.classroom,
      periodNumber,
      students: rankedStudents.map((s) => ({
        rank: s.meritOrder,
        fullName: s.fullName,
        gender: s.gender === 'FEMALE' ? 'Femenino' : 'Masculino',
        average: s.average !== null ? s.average.toFixed(2) : '0.00',
        points: s.points,
        approvedCoursesCount: Object.values(s.courseScores).filter((sc) => sc !== null && sc >= 10.5).length,
        failedCoursesCount: s.failedCoursesCount,
        hasNoGrades: s.hasNoGrades,
        conduct: s.conduct,
        tercio: s.tercio === 'SUP' ? 'Superior' : s.tercio === 'MED' ? 'Medio' : 'Inferior',
      })),
      statistics: {
        studentCounts: {
          invictos: invictosCount,
          withFailed: withFailedCount,
          withoutGrades: withNoGradesCount,
          blankGrades: 0,
          withdrawn: 0,
          total: totalStudents,
        },
        tercios: {
          superior: calculateTercioRow(tercioSuperiorStudents),
          medio: calculateTercioRow(tercioMedioStudents),
          inferior: calculateTercioRow(tercioInferiorStudents),
          withoutTercio: {
            total: withNoGradesCount,
            percent: Math.round((withNoGradesCount / totalStudents) * 1000) / 10,
          },
        },
        classroomAverage,
        maxScore: validAverages.length > 0 ? Math.max(...validAverages) : 0,
        minScore: validAverages.length > 0 ? Math.min(...validAverages) : 0,
      },
      reportCode: '0048',
    };
  }

  /**
   * Reporte 0049: Orden de Mérito y Tercios/Quintos por Grado (Todas las secciones).
   */
  async getMeritGrade(
    schoolId: string,
    educationLevel: EducationLevel,
    grade: number,
    periodNumber: number,
    academicYearId?: string,
  ) {
    const raw = await this.academicReportRepository.findMeritGradeRaw(
      schoolId,
      educationLevel,
      grade,
      periodNumber,
      academicYearId,
    );

    const { school, classrooms, criteria, detailedGrades } = raw;
    const criteriaWeightMap = new Map(criteria.map((c) => [c.id, c.weight || 1]));

    const gradesMap = new Map<string, Array<{ criterionId: string; numericScore: number; shortName?: string }>>();
    detailedGrades.forEach((g) => {
      const key = `${g.enrollmentId}_${g.courseAssignmentId}_${g.competenceId}`;
      if (!gradesMap.has(key)) gradesMap.set(key, []);
      gradesMap.get(key)!.push({
        criterionId: g.criterionId,
        numericScore: g.numericScore,
        shortName: g.criterion?.shortName,
      });
    });

    const allStudents: Array<{
      enrollmentId: string;
      fullName: string;
      gender: string;
      section: string;
      average: number | null;
      points: number;
      approvedCoursesCount: number;
      failedCoursesCount: number;
      hasNoGrades: boolean;
      conduct: number;
    }> = [];

    classrooms.forEach((classroom) => {
      classroom.enrollments.forEach((enr) => {
        const student = enr.student;
        const fullName = `${student.lastNamePaternal} ${student.lastNameMaternal || ''}, ${student.firstNames}`.trim();
        const validScores: number[] = [];
        let conductScore: number | null = null;

        classroom.assignments.forEach((assignment) => {
          const compScores: number[] = [];
          assignment.area.competences.forEach((comp) => {
            const items = gradesMap.get(`${enr.id}_${assignment.id}_${comp.id}`) || [];
            if (items.length > 0) {
              const totalW = items.reduce((acc, it) => acc + (criteriaWeightMap.get(it.criterionId) || 1), 0);
              const weightedSum = items.reduce((acc, it) => acc + it.numericScore * (criteriaWeightMap.get(it.criterionId) || 1), 0);
              const sc = totalW > 0 ? weightedSum / totalW : null;
              if (sc !== null) compScores.push(sc);

              const cond = items.find((it) => it.shortName === 'COND');
              if (cond && conductScore === null) conductScore = cond.numericScore;
            }
          });

          const periodCourseScore =
            compScores.length > 0
              ? Math.round((compScores.reduce((a, b) => a + b, 0) / compScores.length) * 10) / 10
              : null;
          if (periodCourseScore !== null) validScores.push(periodCourseScore);
        });

        const average =
          validScores.length > 0
            ? Math.round((validScores.reduce((a, b) => a + b, 0) / validScores.length) * 100) / 100
            : null;

        const points = validScores.length > 0 ? Math.round(validScores.reduce((a, b) => a + b, 0)) : 0;
        const failedCoursesCount = validScores.filter((sc) => sc < 10.5).length;
        const approvedCoursesCount = validScores.filter((sc) => sc >= 10.5).length;

        allStudents.push({
          enrollmentId: enr.id,
          fullName,
          gender: student.gender === 'FEMALE' ? 'FEM' : 'MAS',
          section: classroom.section,
          average,
          points,
          approvedCoursesCount,
          failedCoursesCount,
          hasNoGrades: validScores.length === 0,
          conduct: conductScore !== null ? Math.round(conductScore) : 20,
        });
      });
    });

    // Ordenar a todos los alumnos del grado
    const evaluatedStudents = allStudents.filter((s) => !s.hasNoGrades);
    evaluatedStudents.sort((a, b) => {
      const avgA = a.average ?? 0;
      const avgB = b.average ?? 0;
      if (avgB !== avgA) return avgB - avgA;
      if (b.points !== a.points) return b.points - a.points;
      return a.fullName.localeCompare(b.fullName);
    });

    const totalEvaluated = evaluatedStudents.length;
    const thirdSize = Math.ceil(totalEvaluated / 3);
    const fifthSize = Math.ceil(totalEvaluated / 5);

    const rankedStudents = evaluatedStudents.map((student, idx) => {
      let tercio = 'Inferior';
      if (idx < thirdSize) tercio = 'Superior';
      else if (idx < thirdSize * 2) tercio = 'Medio';

      let quinto = 'Segundo';
      if (idx < fifthSize) quinto = 'Quinto';
      else if (idx < fifthSize * 2) quinto = 'Cuarto';
      else if (idx < fifthSize * 3) quinto = 'Tercio';

      return {
        rank: idx + 1,
        ...student,
        average: student.average !== null ? student.average.toFixed(2) : '0.00',
        tercio,
        quinto,
      };
    });

    // Resolver empates en ranking
    for (let i = 1; i < rankedStudents.length; i++) {
      const prev = rankedStudents[i - 1];
      const curr = rankedStudents[i];
      if (prev.average === curr.average && prev.points === curr.points) {
        curr.rank = prev.rank;
      }
    }

    // Estadísticas
    const totalStudents = allStudents.length;
    const invictosCount = allStudents.filter((s) => s.failedCoursesCount === 0 && !s.hasNoGrades).length;
    const withFailedCount = allStudents.filter((s) => s.failedCoursesCount > 0).length;
    const withoutGradesCount = allStudents.filter((s) => s.hasNoGrades).length;

    const tercioSuperior = rankedStudents.filter((s) => s.tercio === 'Superior');
    const tercioMedio = rankedStudents.filter((s) => s.tercio === 'Medio');
    const tercioInferior = rankedStudents.filter((s) => s.tercio === 'Inferior');

    const calculateTercioStat = (group: typeof rankedStudents) => {
      const count = group.length;
      if (count === 0) return { total: 0, percent: 0, initialScore: 0, finalScore: 0, average: 0 };
      const avgs = group.map((s) => parseFloat(s.average));
      return {
        total: count,
        percent: Math.round((count / totalStudents) * 1000) / 10,
        initialScore: Math.max(...avgs),
        finalScore: Math.min(...avgs),
        average: Math.round((avgs.reduce((a, b) => a + b, 0) / count) * 100) / 100,
      };
    };

    const validAverages = rankedStudents.map((s) => parseFloat(s.average));
    const gradeAverage =
      validAverages.length > 0
        ? Math.round((validAverages.reduce((a, b) => a + b, 0) / validAverages.length) * 100) / 100
        : 0;

    return {
      school,
      educationLevel,
      grade,
      periodNumber,
      students: rankedStudents,
      statistics: {
        studentCounts: {
          invictos: invictosCount,
          withFailed: withFailedCount,
          withoutGrades: withoutGradesCount,
          blankGrades: 0,
          withdrawn: 0,
          total: totalStudents,
        },
        tercios: {
          superior: calculateTercioStat(tercioSuperior),
          medio: calculateTercioStat(tercioMedio),
          inferior: calculateTercioStat(tercioInferior),
          withoutTercio: {
            total: withoutGradesCount,
            percent: Math.round((withoutGradesCount / totalStudents) * 1000) / 10,
          },
        },
        gradeAverage,
        maxScore: validAverages.length > 0 ? Math.max(...validAverages) : 0,
        minScore: validAverages.length > 0 ? Math.min(...validAverages) : 0,
      },
      reportCode: '0049',
    };
  }

  /**
   * Reporte 0041: Registro Auxiliar Borrador (Plantilla en blanco).
   */
  async getDraftRegister(schoolId: string, classroomId: string, courseAssignmentId?: string) {
    const raw = await this.academicReportRepository.findDraftRegisterRaw(
      schoolId,
      classroomId,
      courseAssignmentId,
    );

    const { classroom, assignment } = raw;

    return {
      school: classroom.school,
      classroom: {
        id: classroom.id,
        grade: classroom.grade,
        section: classroom.section,
        educationLevel: classroom.educationLevel,
      },
      course: assignment
        ? {
            id: assignment.id,
            name: assignment.area.name,
            officialCode: assignment.area.officialCode,
            teacherName: `${assignment.teacher.lastNamePaternal} ${assignment.teacher.firstName}`.trim(),
          }
        : null,
      students: classroom.enrollments.map((enr, idx) => ({
        index: idx + 1,
        enrollmentId: enr.id,
        studentCode: enr.student.studentCode,
        documentId: enr.student.documentId,
        fullName: `${enr.student.lastNamePaternal} ${enr.student.lastNameMaternal || ''}, ${enr.student.firstNames}`.trim(),
      })),
      blankCriteriaColumnsCount: 20,
      reportCode: '0041',
    };
  }

  /**
   * Reporte 0030: Listado de Comentarios a la Conducta.
   */
  async getConductComments(schoolId: string, classroomId: string, periodNumber: number) {
    const classroom = await this.academicReportRepository.findConductCommentsRaw(
      schoolId,
      classroomId,
      periodNumber,
    );

    const students = classroom.enrollments.map((enr, idx) => {
      const conductGrades = enr.detailedGrades.map((dg) => dg.numericScore);
      const avgConduct =
        conductGrades.length > 0
          ? Math.round(conductGrades.reduce((a, b) => a + b, 0) / conductGrades.length)
          : 20;

      const comments = [
        ...enr.detailedGrades.map((dg) => dg.comment).filter(Boolean),
        ...enr.competenceConclusions.map((cc) => cc.conclusion).filter(Boolean),
      ];

      return {
        index: idx + 1,
        enrollmentId: enr.id,
        studentCode: enr.student.studentCode,
        documentId: enr.student.documentId,
        fullName: `${enr.student.lastNamePaternal} ${enr.student.lastNameMaternal || ''}, ${enr.student.firstNames}`.trim(),
        conductScore: avgConduct,
        comments: comments.length > 0 ? comments.join(' | ') : 'Sin observaciones conductuales registradas.',
      };
    });

    return {
      school: classroom.school,
      classroom: {
        id: classroom.id,
        grade: classroom.grade,
        section: classroom.section,
        educationLevel: classroom.educationLevel,
        tutorTeacher: classroom.tutorTeacher
          ? `${classroom.tutorTeacher.lastNamePaternal} ${classroom.tutorTeacher.firstName}`.trim()
          : 'Sin tutor asignado',
      },
      periodNumber,
      students,
      reportCode: '0030',
    };
  }

  /**
   * Reporte 0011: Reporte de Alumnos por Salón (Padrón Oficial).
   */
  async getClassroomRoster(schoolId: string, classroomId: string) {
    const classroom = await this.academicReportRepository.findClassroomRosterRaw(
      schoolId,
      classroomId,
    );

    const students = classroom.enrollments.map((enr, idx) => {
      const student = enr.student;
      const guardian = student.familyRelations[0]?.user;

      return {
        index: idx + 1,
        enrollmentId: enr.id,
        studentCode: student.studentCode || '—',
        documentId: student.documentId,
        fullName: `${student.lastNamePaternal} ${student.lastNameMaternal || ''}, ${student.firstNames}`.trim(),
        gender: student.gender === 'FEMALE' ? 'F' : 'M',
        birthDate: student.birthDate ? student.birthDate.toISOString().split('T')[0] : '—',
        enrollmentState: enr.enrollmentState,
        guardianName: guardian
          ? `${guardian.lastNamePaternal} ${guardian.lastNameMaternal || ''}, ${guardian.firstName}`.trim()
          : '—',
        guardianPhone: guardian?.cellphone || '—',
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
        tutorTeacher: classroom.tutorTeacher
          ? `${classroom.tutorTeacher.lastNamePaternal} ${classroom.tutorTeacher.firstName}`.trim()
          : 'Sin tutor asignado',
      },
      students,
      totalStudents: students.length,
      reportCode: '0011',
    };
  }

  /**
   * Reporte 0001: Listado de Familias por Estado.
   */
  async getFamiliesByState(
    schoolId: string,
    state?: 'ALL' | 'REGISTERED' | 'TRANSFERRED' | 'WITHDRAWN',
    academicYearId?: string,
  ) {
    const raw = await this.academicReportRepository.findFamiliesByStateRaw(
      schoolId,
      state,
      academicYearId,
    );

    const { school, students } = raw;

    const levelLabels: Record<string, string> = {
      INITIAL: 'Inicial',
      PRIMARY: 'Primaria',
      SECONDARY: 'Secundaria',
    };

    const familyMap = new Map<
      string,
      {
        familyKey: string;
        familyName: string;
        father: { name: string; phone: string; email: string } | null;
        mother: { name: string; phone: string; email: string } | null;
        guardian: { name: string; phone: string; email: string } | null;
        address: string;
        children: Array<{
          id: string;
          fullName: string;
          studentCode: string;
          documentId: string;
          classroomLabel: string;
          enrollmentState: string;
        }>;
      }
    >();

    students.forEach((student) => {
      const fatherRel = student.familyRelations.find((r) => r.relationshipType === 'FATHER');
      const motherRel = student.familyRelations.find((r) => r.relationshipType === 'MOTHER');
      const guardianRel = student.familyRelations.find((r) => r.isLegalGuardian);

      let familyKey = '';
      if (fatherRel?.user?.id && motherRel?.user?.id) {
        familyKey = [fatherRel.user.id, motherRel.user.id].sort().join('_');
      } else if (fatherRel?.user?.id) {
        familyKey = `father_${fatherRel.user.id}`;
      } else if (motherRel?.user?.id) {
        familyKey = `mother_${motherRel.user.id}`;
      } else {
        familyKey = `surnames_${student.lastNamePaternal.trim().toLowerCase()}_${(student.lastNameMaternal || '').trim().toLowerCase()}`;
      }

      const familyName = `Familia ${student.lastNamePaternal} ${student.lastNameMaternal || ''}`.trim();
      const currentEnrollment = student.enrollments[0];
      const classroomLabel = currentEnrollment?.classroom
        ? `${currentEnrollment.classroom.grade}° "${currentEnrollment.classroom.section}" - ${levelLabels[currentEnrollment.classroom.educationLevel] || currentEnrollment.classroom.educationLevel}`
        : 'Sin aula';

      if (!familyMap.has(familyKey)) {
        familyMap.set(familyKey, {
          familyKey,
          familyName,
          father: fatherRel?.user
            ? {
                name: `${fatherRel.user.lastNamePaternal} ${fatherRel.user.lastNameMaternal || ''}, ${fatherRel.user.firstName}`.trim(),
                phone: fatherRel.user.cellphone || '—',
                email: fatherRel.user.email || '—',
              }
            : null,
          mother: motherRel?.user
            ? {
                name: `${motherRel.user.lastNamePaternal} ${motherRel.user.lastNameMaternal || ''}, ${motherRel.user.firstName}`.trim(),
                phone: motherRel.user.cellphone || '—',
                email: motherRel.user.email || '—',
              }
            : null,
          guardian: guardianRel?.user
            ? {
                name: `${guardianRel.user.lastNamePaternal} ${guardianRel.user.lastNameMaternal || ''}, ${guardianRel.user.firstName}`.trim(),
                phone: guardianRel.user.cellphone || '—',
                email: guardianRel.user.email || '—',
              }
            : null,
          address: school.address || '—',
          children: [],
        });
      }

      const fam = familyMap.get(familyKey)!;
      fam.children.push({
        id: student.id,
        fullName: `${student.lastNamePaternal} ${student.lastNameMaternal || ''}, ${student.firstNames}`.trim(),
        studentCode: student.studentCode || '—',
        documentId: student.documentId,
        classroomLabel,
        enrollmentState: currentEnrollment?.enrollmentState || 'REGISTERED',
      });
    });

    const families = Array.from(familyMap.values()).map((fam, idx) => ({
      index: idx + 1,
      familyCode: `FAM-${(idx + 1).toString().padStart(4, '0')}`,
      familyName: fam.familyName,
      fatherName: fam.father?.name || '—',
      fatherPhone: fam.father?.phone || '—',
      fatherEmail: fam.father?.email || '—',
      motherName: fam.mother?.name || '—',
      motherPhone: fam.mother?.phone || '—',
      motherEmail: fam.mother?.email || '—',
      guardianName: fam.guardian?.name || '—',
      guardianPhone: fam.guardian?.phone || '—',
      address: fam.address,
      state: fam.children[0]?.enrollmentState || (state && state !== 'ALL' ? state : 'REGISTERED'),
      childrenCount: fam.children.length,
      childrenSummary: fam.children.map((c) => `${c.fullName} (${c.classroomLabel})`).join('; '),
      children: fam.children,
    }));

    return {
      school,
      filterState: state || 'ALL',
      families,
      totalFamilies: families.length,
      totalStudents: students.length,
      reportCode: '0001',
    };
  }

  /**
   * Reporte 0002: Listado de Familias e Hijos.
   */
  async getFamiliesWithChildren(
    schoolId: string,
    classroomId?: string,
    academicYearId?: string,
  ) {
    const raw = await this.academicReportRepository.findFamiliesWithChildrenRaw(
      schoolId,
      classroomId,
      academicYearId,
    );

    const { school, students } = raw;

    const levelLabels: Record<string, string> = {
      INITIAL: 'Inicial',
      PRIMARY: 'Primaria',
      SECONDARY: 'Secundaria',
    };

    const familyMap = new Map<
      string,
      {
        familyKey: string;
        familyName: string;
        fatherName: string;
        motherName: string;
        phone: string;
        address: string;
        children: Array<{
          studentCode: string;
          documentId: string;
          fullName: string;
          level: string;
          grade: number;
          section: string;
          classroomLabel: string;
          enrollmentState: string;
        }>;
      }
    >();

    students.forEach((student) => {
      const fatherRel = student.familyRelations.find((r) => r.relationshipType === 'FATHER');
      const motherRel = student.familyRelations.find((r) => r.relationshipType === 'MOTHER');
      const guardianRel = student.familyRelations.find((r) => r.isLegalGuardian);

      let familyKey = '';
      if (fatherRel?.user?.id && motherRel?.user?.id) {
        familyKey = [fatherRel.user.id, motherRel.user.id].sort().join('_');
      } else if (fatherRel?.user?.id) {
        familyKey = `father_${fatherRel.user.id}`;
      } else if (motherRel?.user?.id) {
        familyKey = `mother_${motherRel.user.id}`;
      } else {
        familyKey = `surnames_${student.lastNamePaternal.trim().toLowerCase()}_${(student.lastNameMaternal || '').trim().toLowerCase()}`;
      }

      const familyName = `Familia ${student.lastNamePaternal} ${student.lastNameMaternal || ''}`.trim();
      const fatherName = fatherRel?.user
        ? `${fatherRel.user.lastNamePaternal} ${fatherRel.user.lastNameMaternal || ''}, ${fatherRel.user.firstName}`.trim()
        : '—';
      const motherName = motherRel?.user
        ? `${motherRel.user.lastNamePaternal} ${motherRel.user.lastNameMaternal || ''}, ${motherRel.user.firstName}`.trim()
        : '—';
      const phone =
        fatherRel?.user?.cellphone || motherRel?.user?.cellphone || guardianRel?.user?.cellphone || '—';

      const currentEnrollment = student.enrollments[0];
      const classroom = currentEnrollment?.classroom;
      const classroomLabel = classroom
        ? `${classroom.grade}° "${classroom.section}" - ${levelLabels[classroom.educationLevel] || classroom.educationLevel}`
        : 'Sin aula';

      if (!familyMap.has(familyKey)) {
        familyMap.set(familyKey, {
          familyKey,
          familyName,
          fatherName,
          motherName,
          phone,
          address: school.address || '—',
          children: [],
        });
      }

      const fam = familyMap.get(familyKey)!;
      fam.children.push({
        studentCode: student.studentCode || '—',
        documentId: student.documentId,
        fullName: `${student.lastNamePaternal} ${student.lastNameMaternal || ''}, ${student.firstNames}`.trim(),
        level: classroom ? levelLabels[classroom.educationLevel] || classroom.educationLevel : '—',
        grade: classroom ? classroom.grade : 0,
        section: classroom ? classroom.section : '—',
        classroomLabel,
        enrollmentState: currentEnrollment?.enrollmentState || 'REGISTERED',
      });
    });

    const families = Array.from(familyMap.values()).map((fam, idx) => ({
      index: idx + 1,
      familyCode: `FAM-${(idx + 1).toString().padStart(4, '0')}`,
      familyName: fam.familyName,
      fatherName: fam.fatherName,
      motherName: fam.motherName,
      phone: fam.phone,
      address: fam.address,
      childrenCount: fam.children.length,
      children: fam.children.map((c, cIdx) => ({
        index: cIdx + 1,
        ...c,
      })),
    }));

    return {
      school,
      families,
      totalFamilies: families.length,
      totalChildren: students.length,
      reportCode: '0002',
    };
  }

  /**
   * Reporte 0003: Listado de Familias y Parientes (Directorio Institucional).
   */
  async getFamiliesRelatives(
    schoolId: string,
    classroomId?: string,
    academicYearId?: string,
  ) {
    const raw = await this.academicReportRepository.findFamiliesRelativesRaw(
      schoolId,
      classroomId,
      academicYearId,
    );

    const { school, students } = raw;

    const levelLabels: Record<string, string> = {
      INITIAL: 'Inicial',
      PRIMARY: 'Primaria',
      SECONDARY: 'Secundaria',
    };

    const records = students.map((student, idx) => {
      const fatherRel = student.familyRelations.find((r) => r.relationshipType === 'FATHER');
      const motherRel = student.familyRelations.find((r) => r.relationshipType === 'MOTHER');
      const guardianRel =
        student.familyRelations.find((r) => r.isLegalGuardian) ||
        student.familyRelations[0];

      const currentEnrollment = student.enrollments[0];
      const classroom = currentEnrollment?.classroom;
      const classroomLabel = classroom
        ? `${classroom.grade}° "${classroom.section}" - ${levelLabels[classroom.educationLevel] || classroom.educationLevel}`
        : 'Sin aula';

      return {
        index: idx + 1,
        student: {
          id: student.id,
          studentCode: student.studentCode || '—',
          documentId: student.documentId,
          fullName: `${student.lastNamePaternal} ${student.lastNameMaternal || ''}, ${student.firstNames}`.trim(),
          classroomLabel,
          level: classroom ? levelLabels[classroom.educationLevel] || classroom.educationLevel : '—',
        },
        father: {
          fullName: fatherRel?.user
            ? `${fatherRel.user.lastNamePaternal} ${fatherRel.user.lastNameMaternal || ''}, ${fatherRel.user.firstName}`.trim()
            : '—',
          documentId: fatherRel?.user?.documentId || '—',
          phone: fatherRel?.user?.cellphone || '—',
          email: fatherRel?.user?.email || '—',
        },
        mother: {
          fullName: motherRel?.user
            ? `${motherRel.user.lastNamePaternal} ${motherRel.user.lastNameMaternal || ''}, ${motherRel.user.firstName}`.trim()
            : '—',
          documentId: motherRel?.user?.documentId || '—',
          phone: motherRel?.user?.cellphone || '—',
          email: motherRel?.user?.email || '—',
        },
        guardian: {
          fullName: guardianRel?.user
            ? `${guardianRel.user.lastNamePaternal} ${guardianRel.user.lastNameMaternal || ''}, ${guardianRel.user.firstName}`.trim()
            : '—',
          documentId: guardianRel?.user?.documentId || '—',
          relationship: guardianRel?.relationshipType || 'Apoderado',
          phone: guardianRel?.user?.cellphone || '—',
          email: guardianRel?.user?.email || '—',
        },
      };
    });

    return {
      school,
      records,
      totalRecords: records.length,
      reportCode: '0003',
    };
  }

  /**
   * Reporte 0019: Listado de Cumpleaños del Alumno.
   */
  async getStudentBirthdays(
    schoolId: string,
    month?: number,
    classroomId?: string,
    educationLevel?: EducationLevel,
    academicYearId?: string,
  ) {
    const raw = await this.academicReportRepository.findStudentBirthdaysRaw(
      schoolId,
      classroomId,
      educationLevel,
      academicYearId,
    );

    const { school, students } = raw;
    const currentYear = new Date().getFullYear();

    const levelLabels: Record<string, string> = {
      INITIAL: 'Inicial',
      PRIMARY: 'Primaria',
      SECONDARY: 'Secundaria',
    };

    const monthNames = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Setiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ];

    const filtered = students
      .filter((student) => student.birthDate !== null)
      .map((student) => {
        const d = new Date(student.birthDate!);
        const birthDay = d.getUTCDate();
        const birthMonth = d.getUTCMonth() + 1;
        const birthYear = d.getUTCFullYear();
        const ageTurning = currentYear - birthYear;

        const currentEnrollment = student.enrollments[0];
        const classroom = currentEnrollment?.classroom;
        const classroomLabel = classroom
          ? `${classroom.grade}° "${classroom.section}"`
          : 'Sin aula';
        const levelLabel = classroom
          ? levelLabels[classroom.educationLevel] || classroom.educationLevel
          : '—';

        return {
          id: student.id,
          studentCode: student.studentCode || '—',
          fullName: `${student.lastNamePaternal} ${student.lastNameMaternal || ''}, ${student.firstNames}`.trim(),
          gender: student.gender === 'FEMALE' ? 'F' : 'M',
          birthDateFormatted: `${birthDay.toString().padStart(2, '0')}/${birthMonth.toString().padStart(2, '0')}/${birthYear}`,
          day: birthDay,
          month: birthMonth,
          monthName: monthNames[birthMonth - 1],
          ageTurning,
          classroomLabel,
          educationLevel: levelLabel,
        };
      })
      .filter((s) => !month || s.month === month);

    // Ordenar cronológicamente por mes y día
    filtered.sort((a, b) => {
      if (a.month !== b.month) return a.month - b.month;
      if (a.day !== b.day) return a.day - b.day;
      return a.fullName.localeCompare(b.fullName);
    });

    const studentsWithIndex = filtered.map((s, idx) => ({
      index: idx + 1,
      ...s,
    }));

    return {
      school,
      month: month || null,
      monthName: month ? monthNames[month - 1] : 'Todos los meses',
      students: studentsWithIndex,
      totalStudents: studentsWithIndex.length,
      reportCode: '0019',
    };
  }
}
