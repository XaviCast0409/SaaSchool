import { Router } from 'express';
import { CatalogController } from './catalog.controller';

const controller = new CatalogController();

export const catalogRouter = Router();

/**
 * Endpoints de catálogo — sin autenticación requerida.
 * Son datos estáticos de referencia del sistema (MINEDU oficial).
 * GET /api/catalog/grades?level=PRIMARY
 * GET /api/catalog/courses?level=SECONDARY
 */
catalogRouter.get('/grades', controller.getGrades);
catalogRouter.get('/courses', controller.getCourses);
