/** Recalcula CompetencePeriodResult para todas las asignaciones vigentes de todos los colegios. */
import { prisma } from '../src/config/prisma';
import { ResultsService } from '../src/modules/academic/results.service';

async function main() {
  const service = new ResultsService();
  const assignments = await prisma.courseAssignment.findMany({
    where: { deletedAt: null, academicYear: { isActive: true } },
    select: { id: true, schoolId: true },
  });
  for (const a of assignments) await service.recomputeAssignment(a.schoolId, a.id);
  console.log(`Recalculadas ${assignments.length} asignaciones.`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());

