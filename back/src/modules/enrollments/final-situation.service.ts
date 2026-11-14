import { prisma } from '../../config/prisma';
import { AppError } from '../../core/errors/app-error';
import { ConsolidationService } from '../academic/consolidation.service';

const LEVEL: Record<string, string> = { INITIAL: 'Inicial', PRIMARY: 'Primaria', SECONDARY: 'Secundaria' };
const label = (c: { educationLevel: string; grade: number; section: string }) =>
  `${c.educationLevel === 'INITIAL' ? `${c.grade} años` : `${c.grade}.° ${LEVEL[c.educationLevel]}`} "${c.section}"`;

export interface ClassroomFinalSituation {
  classroomId: string;
  label: string;
  students: number;
  saved: number;
  missingGrades: number;
  skipped: boolean;
  byStatus: Record<string, number>;
}

/**
 * Situación final del año (promovido, recuperación, permanece) calculada con el consolidado final
 * de notas y guardada en cada matrícula. La re-matrícula la usa para proponer el grado. Un aula con
 * notas incompletas no se guarda (la situación sería provisional), salvo que se fuerce.
 */
export class FinalSituationService {
  private readonly consolidation = new ConsolidationService();

  async run(schoolId: string, input: { academicYearId: string; classroomId?: string; dryRun: boolean; force?: boolean }) {
    const year = await prisma.academicYear.findFirst({ where: { id: input.academicYearId, schoolId }, select: { id: true, year: true } });
    if (!year) throw new AppError('Año académico no encontrado.', 404);
    const rooms = await prisma.classroom.findMany({
      where: {
        schoolId,
        ...(input.classroomId ? { id: input.classroomId } : {}),
        enrollments: { some: { academicYearId: year.id } },
      },
      select: { id: true, educationLevel: true, grade: true, section: true },
      orderBy: [{ educationLevel: 'asc' }, { grade: 'asc' }, { section: 'asc' }],
    });

    const classrooms: ClassroomFinalSituation[] = [];
    for (const room of rooms) {
      const data = await this.consolidation.getClassroomConsolidation(schoolId, room.id, 'FINAL', year.id);
      const students = data.matrix.students.filter((s) => s.finalSituation);
      const byStatus: Record<string, number> = {};
      for (const s of students) byStatus[s.finalSituation!] = (byStatus[s.finalSituation!] ?? 0) + 1;
      const missingGrades = data.summary.missingGrades;
      // Inicial no tiene situación final por notas (todos pasan); el resto exige notas completas
      const skipped = missingGrades > 0 && !input.force;
      let saved = 0;
      if (!input.dryRun && !skipped) {
        for (const s of students) {
          await prisma.enrollment.update({ where: { id: s.enrollmentId }, data: { finalSituation: s.finalSituation } });
          saved++;
        }
      }
      classrooms.push({ classroomId: room.id, label: label(room), students: students.length, saved, missingGrades, skipped, byStatus });
    }

    const totals: Record<string, number> = {};
    for (const c of classrooms) for (const [k, v] of Object.entries(c.byStatus)) totals[k] = (totals[k] ?? 0) + v;
    return {
      year: year.year,
      dryRun: input.dryRun,
      classrooms,
      totals,
      saved: classrooms.reduce((a, c) => a + c.saved, 0),
      skippedClassrooms: classrooms.filter((c) => c.skipped).length,
    };
  }
}

export const finalSituationService = new FinalSituationService();
