import type { NextFunction, Request, Response } from 'express';
import { selectedAcademicYearId } from '../../utils/academic-year-scope';

/**
 * Completa el año de la petición con el elegido en la cabecera, sin pisar uno que ya venga indicado.
 * Solo toca objetos (no listas) y no hace nada si no hay año elegido.
 */
export function fillAcademicYear(req: { query: Record<string, unknown>; body?: unknown }, selected: string | undefined): void {
  if (!selected) return;
  if (req.query.academicYearId === undefined) req.query.academicYearId = selected;
  const body = req.body as Record<string, unknown> | undefined;
  if (body && typeof body === 'object' && !Array.isArray(body) && body.academicYearId === undefined) body.academicYearId = selected;
}

/**
 * Año que se está viendo en la cabecera (solo Dirección puede elegir otro): si la petición no indica año,
 * se usa ese. Así plan de estudios, carga docente, periodos, avance, consolidado y libretas muestran
 * y guardan en el año elegido, igual que el resto del sistema. Docentes y familias: siempre el vigente.
 */
export async function useSelectedAcademicYear(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    fillAcademicYear(req as unknown as { query: Record<string, unknown>; body?: unknown }, await selectedAcademicYearId(req));
    next();
  } catch (err) {
    next(err);
  }
}
