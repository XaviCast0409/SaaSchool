/**
 * Interfaz genérica para respuestas paginadas.
 * Usada por los servicios que retornan listas de recursos.
 */
export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Parámetros de paginación esperados en req.query
 */
export interface PaginationParams {
  page: number;
  limit: number;
}

/**
 * Extensión del tipo Request de Express para incluir el usuario autenticado.
 * El tenant middleware inyecta schoolId en req.user.
 */
export interface AuthenticatedUser {
  userId: string;
  schoolId: string;
  role: string;
  email: string;
}

// Augmentación del namespace de Express para tipado global
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
