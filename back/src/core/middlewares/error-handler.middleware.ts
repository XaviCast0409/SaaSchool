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
 * - AppError → errores operacionales controlados (4xx, 5xx personalizados)
 * - ZodError → errores de validación de datos de entrada
 * - Prisma errors conocidos → convertidos a mensajes amigables
 * - Otros → error genérico 500
 */
export const globalErrorHandler = (
  error: Error,
  _request: Request,
  response: Response,
  _next: NextFunction,
): void => {
  // Errores de validación de Zod
  if (error instanceof ZodError) {
    response.status(422).json({
      status: 'fail',
      message: 'Error de validación en los datos de entrada',
      errors: error.flatten().fieldErrors,
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

  // Errores de Prisma — Constraint violations
  if (error.constructor.name === 'PrismaClientKnownRequestError') {
    const prismaError = error as Error & { code: string; meta?: Record<string, unknown> };

    if (prismaError.code === 'P2002') {
      response.status(409).json({
        status: 'fail',
        message: 'Ya existe un registro con ese valor único.',
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

  // Error no controlado (programming error)
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
