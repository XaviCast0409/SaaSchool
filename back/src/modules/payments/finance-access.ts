import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { AppError } from '../../core/errors/app-error';
import { can, financeLevel, type FinanceCapability, type FinanceLevel } from './finance.rules';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      financeLevel?: FinanceLevel;
    }
  }
}

/**
 * Calcula el nivel en finanzas de quien hace la petición. El rol en finanzas se lee de la
 * base en cada petición (no viaja en el token), así un cambio de rol aplica al instante.
 */
export async function resolveFinanceLevel(request: Request): Promise<FinanceLevel> {
  if (request.financeLevel) return request.financeLevel;
  const user = request.user;
  if (!user) return 'NONE';
  let financeRole: string | null = null;
  if (user.role === 'ADMINISTRATIVE') {
    const row = await prisma.user.findUnique({ where: { id: user.userId }, select: { financeRole: true } });
    financeRole = row?.financeRole ?? null;
  }
  request.financeLevel = financeLevel(user.role, financeRole);
  return request.financeLevel;
}

/** Exige al menos una de las capacidades indicadas. */
export const requireFinance = (...anyOf: FinanceCapability[]) => {
  return async (request: Request, _response: Response, next: NextFunction): Promise<void> => {
    const level = await resolveFinanceLevel(request);
    if (!anyOf.some((c) => can(level, c))) {
      throw new AppError('No tienes permisos de caja y tesorería para realizar esta acción.', 403);
    }
    next();
  };
};
