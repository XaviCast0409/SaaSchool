import { Request, Response } from 'express';
import {
  GRADE_CATALOG,
  COURSE_CATALOG,
  getGradesByLevel,
  getCoursesByLevel,
  type EducationLevel,
} from './catalog.data';

/**
 * CatalogController — endpoints de solo lectura sin autenticación.
 * Sirve los catálogos oficiales MINEDU para que el frontend use selectores
 * en lugar de inputs de texto libre.
 */
export class CatalogController {
  /** GET /api/catalog/grades — Todos los grados o filtrados por nivel */
  getGrades = (_request: Request, response: Response): void => {
    const level = _request.query.level as EducationLevel | undefined;

    const grades = level ? getGradesByLevel(level) : GRADE_CATALOG;

    response.status(200).json({
      status: 'success',
      data: grades,
    });
  };

  /** GET /api/catalog/courses — Todos los cursos o filtrados por nivel */
  getCourses = (_request: Request, response: Response): void => {
    const level = _request.query.level as EducationLevel | undefined;

    const courses = level ? getCoursesByLevel(level) : COURSE_CATALOG;

    response.status(200).json({
      status: 'success',
      data: courses,
    });
  };
}
