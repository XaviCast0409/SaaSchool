import type { AcademicYear, Prisma } from '@prisma/client';
import { AppError } from '../../core/errors/app-error';
import { prisma } from '../../config/prisma';
import type { AcademicYearRepository } from './academic-year.repository';
import type { CreateAcademicYearDto, UpdateAcademicYearDto } from './academic-year.schema';

type Tx = Prisma.TransactionClient;

/**
 * Regla única del sistema: Enrollment.isActive = la matrícula pertenece al año ACTIVO y está REGISTRADA.
 * Se recalcula completa cada vez que cambia el año activo, así el cambio de año es reversible
 * (activar 2027 y volver a 2026 deja todo como estaba).
 */
export async function syncEnrollmentActiveFlags(tx: Tx, schoolId: string, activeYearId: string | null): Promise<void> {
  if (!activeYearId) {
    await tx.enrollment.updateMany({ where: { schoolId, isActive: true }, data: { isActive: false } });
    return;
  }
  await tx.enrollment.updateMany({
    where: { schoolId, isActive: true, NOT: { academicYearId: activeYearId, enrollmentState: 'REGISTERED' } },
    data: { isActive: false },
  });
  await tx.enrollment.updateMany({
    where: { schoolId, academicYearId: activeYearId, enrollmentState: 'REGISTERED', isActive: false },
    data: { isActive: true },
  });
}

function validatePeriods(dto: {
  periodType?: string;
  periodsConfig?: Array<{ periodNumber: number; name: string; startDate: string; endDate: string }> | null;
  startDate?: string;
  endDate?: string;
}): void {
  if (!dto.periodsConfig || dto.periodsConfig.length === 0) return;
  const expected = dto.periodType === 'TRIMESTER' ? 3 : 4;
  const periods = [...dto.periodsConfig].sort((a, b) => a.periodNumber - b.periodNumber);
  if (periods.length !== expected || periods.some((p, i) => p.periodNumber !== i + 1)) {
    throw new AppError(`Debes configurar exactamente ${expected} periodos numerados del 1 al ${expected}.`, 400);
  }
  const yearStart = dto.startDate ? new Date(dto.startDate) : null;
  const yearEnd = dto.endDate ? new Date(dto.endDate) : null;
  let previousEnd: Date | null = null;
  for (const p of periods) {
    const s = new Date(p.startDate);
    const e = new Date(p.endDate);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || s > e) {
      throw new AppError(`Las fechas del periodo ${p.periodNumber} no son válidas.`, 400);
    }
    if (previousEnd && s <= previousEnd) {
      throw new AppError(`El periodo ${p.periodNumber} empieza antes de que termine el anterior.`, 400);
    }
    if ((yearStart && s < yearStart) || (yearEnd && e > yearEnd)) {
      throw new AppError(`El periodo ${p.periodNumber} está fuera de las fechas del año lectivo.`, 400);
    }
    previousEnd = e;
  }
}

export class AcademicYearService {
  constructor(private readonly academicYearRepository: AcademicYearRepository) {}

  /** Activa un año, desactiva los demás y recalcula qué matrículas están vigentes. */
  async activateExclusively(schoolId: string, academicYearId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.academicYear.updateMany({ where: { schoolId, id: { not: academicYearId }, isActive: true }, data: { isActive: false } });
      await tx.academicYear.update({ where: { id: academicYearId }, data: { isActive: true } });
      await syncEnrollmentActiveFlags(tx, schoolId, academicYearId);
    });
  }

  async getAllAcademicYears(schoolId: string): Promise<AcademicYear[]> {
    return this.academicYearRepository.findAllBySchool(schoolId);
  }

  async getAcademicYearById(academicYearId: string, schoolId: string): Promise<AcademicYear> {
    const academicYear = await this.academicYearRepository.findById(academicYearId, schoolId);
    if (!academicYear) {
      throw new AppError(`Año lectivo con id ${academicYearId} no encontrado`, 404);
    }
    return academicYear;
  }

  async createAcademicYear(schoolId: string, createDto: CreateAcademicYearDto): Promise<AcademicYear> {
    const existing = await this.academicYearRepository.findByYear(schoolId, createDto.year);
    if (existing) {
      throw new AppError(`El Año Lectivo ${createDto.year} ya se encuentra registrado en este colegio.`, 409);
    }
    validatePeriods(createDto);
    const created = await this.academicYearRepository.create(schoolId, createDto);
    // Si el colegio aún no tiene año activo, el primero se activa; si no, solo cuando se pide expresamente.
    const hasActive = await prisma.academicYear.count({ where: { schoolId, isActive: true } });
    if (createDto.isActive === true || hasActive === 0) {
      await this.activateExclusively(schoolId, created.id);
      return { ...created, isActive: true };
    }
    return created;
  }

  async updateAcademicYear(academicYearId: string, schoolId: string, updateDto: UpdateAcademicYearDto): Promise<AcademicYear> {
    const current = await this.getAcademicYearById(academicYearId, schoolId);

    if (updateDto.year) {
      const existing = await this.academicYearRepository.findByYear(schoolId, updateDto.year);
      if (existing && existing.id !== academicYearId) {
        throw new AppError(`Ya existe otro Año Lectivo registrado para el año ${updateDto.year}.`, 409);
      }
    }
    if (updateDto.isActive === false && current.isActive) {
      throw new AppError('No puedes dejar el colegio sin año activo. Para cambiar de año, activa el otro año.', 400);
    }
    validatePeriods({
      periodType: updateDto.periodType ?? current.periodType,
      periodsConfig: updateDto.periodsConfig === undefined
        ? (current.periodsConfig as Array<{ periodNumber: number; name: string; startDate: string; endDate: string }> | null)
        : updateDto.periodsConfig,
      startDate: updateDto.startDate ?? current.startDate.toISOString(),
      endDate: updateDto.endDate ?? current.endDate.toISOString(),
    });

    const updated = await this.academicYearRepository.update(academicYearId, schoolId, updateDto);
    if (updateDto.isActive === true && !current.isActive) {
      await this.activateExclusively(schoolId, academicYearId);
      return { ...updated, isActive: true };
    }
    return updated;
  }

  async deleteAcademicYear(academicYearId: string, schoolId: string): Promise<AcademicYear> {
    const academicYear = await this.getAcademicYearById(academicYearId, schoolId);
    if (academicYear.isActive) {
      throw new AppError('No se puede eliminar el año activo. Activa otro año primero.', 400);
    }
    const enrollmentCount = await this.academicYearRepository.countEnrollments(academicYearId);
    if (enrollmentCount > 0) {
      throw new AppError(
        `No se puede eliminar el Año Lectivo "${academicYear.name || academicYear.year}" porque cuenta con ${enrollmentCount} estudiantes matriculados.`,
        400,
      );
    }
    const used = await prisma.courseAssignment.count({ where: { academicYearId } });
    if (used > 0) {
      throw new AppError('No se puede eliminar el año: ya tiene carga docente registrada.', 400);
    }
    return this.academicYearRepository.delete(academicYearId, schoolId);
  }
}
