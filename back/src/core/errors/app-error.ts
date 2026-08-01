/**
 * AppError: Error de dominio personalizado.
 * Permite lanzar errores con código HTTP desde cualquier capa (service, repository)
 * y capturarlos de forma centralizada en el Global Error Handler.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    // Mantener el stack trace correcto en TypeScript
    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
