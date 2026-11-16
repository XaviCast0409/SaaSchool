/**
 * AppError: Error de dominio personalizado.
 * Permite lanzar errores con código HTTP desde cualquier capa (service, repository)
 * y capturarlos de forma centralizada en el Global Error Handler.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  /** Código legible por el cliente para decidir qué hacer (p. ej. 'MFA_REQUIRED'). */
  public readonly code?: string;
  /** Datos extra para el cliente (p. ej. la lista de colegios entre los que debe elegir). */
  public readonly details?: unknown;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true, code?: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
    this.details = details;

    // Mantener el stack trace correcto en TypeScript
    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
