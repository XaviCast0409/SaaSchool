import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/app-error';
import { env } from '../../config/env';

interface ErrorResponse {
  status: 'error' | 'fail';
  message: string;
  errors?: unknown;
  stack?: string;
}

/**
 * Global Error Handler Middleware.
 * Centraliza el manejo de TODOS los errores de la aplicación.
 */
export const globalErrorHandler = (
  error: Error,
  _request: Request,
  response: Response,
  _next: NextFunction,
): void => {
  // Errores de validación de Zod
  if (error instanceof ZodError) {
    const formattedErrors = error.flatten().fieldErrors;
    const firstErrorMessage =
      error.issues[0]?.message || 'Error de validación en los datos de entrada';

    response.status(422).json({
      status: 'fail',
      message: firstErrorMessage,
      errors: formattedErrors,
    } satisfies ErrorResponse);
    return;
  }

  // Errores operacionales de la aplicación (AppError)
  if (error instanceof AppError && error.isOperational) {
    response.status(error.statusCode).json({
      status: error.statusCode >= 500 ? 'error' : 'fail',
      message: error.message,
    } satisfies ErrorResponse);
    return;
  }

  // Errores de Prisma — Constraint violations (P2002 Unique Constraint)
  if (error.constructor.name === 'PrismaClientKnownRequestError') {
    const prismaError = error as Error & { code: string; meta?: Record<string, unknown> };

    if (prismaError.code === 'P2002') {
      const meta = prismaError.meta as { target?: string | string[] } | undefined;
      const targetFields = meta?.target
        ? Array.isArray(meta.target)
          ? meta.target
          : [meta.target]
        : [];

      let customMessage = 'Ya existe un registro en la plataforma con ese valor único.';

      if (targetFields.some((f) => f.includes('documentId') || f.includes('documentNumber'))) {
        customMessage = 'El DNI / Número de Documento ingresado ya pertenece a otro estudiante o apoderado registrado.';
      } else if (targetFields.some((f) => f.includes('studentCode') || f.includes('siagieCode'))) {
        customMessage = 'El Código SIAGIE ingresado ya pertenece a otro estudiante registrado.';
      } else if (targetFields.some((f) => f.includes('email'))) {
        customMessage = 'El correo electrónico ingresado ya se encuentra registrado para otro usuario.';
      } else if (targetFields.some((f) => f.includes('cellphone') || f.includes('phone'))) {
        customMessage = 'El número de celular ingresado ya está asociado a otro usuario.';
      } else if (targetFields.length > 0) {
        customMessage = `El campo de valor único '${targetFields.join(', ')}' ya se encuentra registrado en el sistema.`;
      }

      response.status(409).json({
        status: 'fail',
        message: customMessage,
        errors: prismaError.meta,
      } satisfies ErrorResponse);
      return;
    }

    if (prismaError.code === 'P2025') {
      response.status(404).json({
        status: 'fail',
        message: 'Registro no encontrado.',
      } satisfies ErrorResponse);
      return;
    }
  }

  // Error no controlado
  console.error('💥 ERROR NO CONTROLADO:', error);

  const errorResponse: ErrorResponse = {
    status: 'error',
    message: 'Ocurrió un error interno en el servidor.',
  };

  if (env.NODE_ENV === 'development') {
    errorResponse.stack = error.stack;
  }

  response.status(500).json(errorResponse);
};
