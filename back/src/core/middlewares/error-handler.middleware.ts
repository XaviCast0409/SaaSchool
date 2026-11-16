import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import multer from 'multer';
import * as Sentry from '@sentry/node';
import { AppError } from '../errors/app-error';
import { env } from '../../config/env';
import { recordServerError } from '../observability/recent-errors';

interface ErrorResponse {
  status: 'error' | 'fail';
  message: string;
  errors?: unknown;
  code?: string;
  details?: unknown;
  stack?: string;
}

/**
 * Global Error Handler Middleware.
 * Centraliza el manejo de TODOS los errores de la aplicación.
 */
export const globalErrorHandler = (
  error: Error,
  request: Request,
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

  // Errores del lector de cuerpos de Express (body-parser): son errores del cliente, no del servidor
  const httpError = error as Error & { type?: string; status?: number; statusCode?: number; expose?: boolean };
  if (httpError.type === 'entity.parse.failed') {
    response.status(400).json({ status: 'fail', message: 'El cuerpo de la petición no es un JSON válido.' } satisfies ErrorResponse);
    return;
  }
  if (httpError.type === 'entity.too.large') {
    response.status(413).json({ status: 'fail', message: 'La petición es demasiado grande.' } satisfies ErrorResponse);
    return;
  }
  const clientStatus = httpError.status ?? httpError.statusCode;
  if (!(error instanceof AppError) && typeof clientStatus === 'number' && clientStatus >= 400 && clientStatus < 500) {
    response.status(clientStatus).json({
      status: 'fail',
      message: httpError.expose && error.message ? error.message : 'Petición inválida.',
    } satisfies ErrorResponse);
    return;
  }

  // Errores operacionales de la aplicación (AppError)
  if (error instanceof AppError && error.isOperational) {
    response.status(error.statusCode).json({
      status: error.statusCode >= 500 ? 'error' : 'fail',
      message: error.message,
      ...(error.code && { code: error.code }),
      ...(error.details !== undefined && { details: error.details }),
    } satisfies ErrorResponse);
    return;
  }

  // Errores de carga de archivos (Multer)
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      response.status(413).json({
        status: 'fail',
        message: 'El archivo supera el tamaño máximo permitido. Elige un archivo más liviano o comprímelo.',
      } satisfies ErrorResponse);
      return;
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      response.status(400).json({
        status: 'fail',
        message: 'Se superó la cantidad máxima de archivos permitidos en una sola carga.',
      } satisfies ErrorResponse);
      return;
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      response.status(400).json({
        status: 'fail',
        message: 'Campo de archivo no reconocido o no permitido para este formulario.',
      } satisfies ErrorResponse);
      return;
    }
    response.status(400).json({
      status: 'fail',
      message: `Error al cargar archivo: ${error.message}`,
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

      if (
        (prismaError.meta?.modelName === 'School' && targetFields.some((f) => f.includes('documentId'))) ||
        targetFields.some((f) => f.includes('School_documentId_key'))
      ) {
        customMessage = 'Ya existe un colegio registrado con ese RUC.';
      } else if (
        (prismaError.meta?.modelName === 'School' && targetFields.some((f) => f.includes('modularCode'))) ||
        targetFields.some((f) => f.includes('School_modularCode_key'))
      ) {
        customMessage = 'Ya existe un colegio registrado con ese Código Modular.';
      } else if (targetFields.some((f) => f.includes('slug'))) {
        customMessage = 'Ese código de colegio ya está en uso. Elige otro.';
      } else if (targetFields.some((f) => f.includes('documentId') || f.includes('documentNumber'))) {
        customMessage = 'El DNI / Número de Documento ingresado ya pertenece a otro estudiante o apoderado registrado.';
      } else if (targetFields.some((f) => f.includes('studentCode') || f.includes('siagieCode'))) {
        customMessage = 'El Código SIAGIE ingresado ya pertenece a otro estudiante de este colegio.';
      } else if (targetFields.some((f) => f.includes('email'))) {
        customMessage = 'El correo electrónico ingresado ya está registrado para otro usuario de este colegio.';
      } else if (targetFields.some((f) => f.includes('tutorTeacherId'))) {
        customMessage = 'Ese docente ya es tutor(a) de otra aula. Cada docente solo puede ser tutor de una aula.';
      } else if (targetFields.some((f) => f.includes('section'))) {
        customMessage = 'Ya existe un aula con ese nivel, grado, sección y turno.';
      } else if (targetFields.some((f) => f.includes('operation'))) {
        customMessage = 'Ese número de operación ya está registrado en otro cobro activo con el mismo medio de pago.';
      } else if (targetFields.some((f) => f.includes('cellphone') || f.includes('phone'))) {
        customMessage = 'El número de celular ingresado ya está asociado a otro usuario.';
      }
      // Sin coincidencia conocida: mensaje genérico (no se exponen nombres de tablas ni columnas)
      if (customMessage === 'Ya existe un registro en la plataforma con ese valor único.' && targetFields.length > 0) {
        console.warn('[P2002] Restricción única sin mensaje propio:', targetFields.join(', '));
        customMessage = 'Ya existe un registro con esos datos.';
      }

      response.status(409).json({
        status: 'fail',
        message: customMessage,
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
  if (env.SENTRY_DSN) {
    Sentry.captureException(error);
  }

  console.error('💥 ERROR NO CONTROLADO:', error);
  recordServerError({ method: request.method, path: request.originalUrl, message: error.message });

  const errorResponse: ErrorResponse = {
    status: 'error',
    message: 'Ocurrió un error interno en el servidor.',
  };

  if (env.NODE_ENV === 'development') {
    errorResponse.stack = error.stack;
  }

  response.status(500).json(errorResponse);
};
