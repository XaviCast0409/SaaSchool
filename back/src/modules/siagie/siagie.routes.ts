import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { authMiddleware, authorizeRoles } from '../../core/middlewares/auth.middleware';
import { tenantMiddleware } from '../../core/middlewares/tenant.middleware';
import { AppError } from '../../core/errors/app-error';
import { requirePlan } from '../../core/middlewares/plan.middleware';
import { siagieController as c } from './siagie.controller';

const router = Router();
router.use(authMiddleware, tenantMiddleware);

const OFFICE = authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE');
const ADMIN = authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN');
const PRO = requirePlan('PRO', 'ENTERPRISE');

/** Los Excel del SIAGIE se procesan en memoria y nunca se guardan en disco. */
const xlsxUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 40 },
  fileFilter: (_req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() === '.xlsx') cb(null, true);
    else cb(new AppError(`"${file.originalname}" no es un archivo .xlsx. Usa el Excel descargado del SIAGIE sin convertirlo.`, 400));
  },
}).array('files', 40);

// Nómina (rptListadoEstudiantes.xlsx)
router.post('/nomina/preview', OFFICE, xlsxUpload, c.nominaPreview);
router.post('/nomina/commit', OFFICE, xlsxUpload, c.nominaCommit);

// Registro de notas (RegNotas_*.xlsx)
router.post('/templates/inspect', OFFICE, PRO, xlsxUpload, c.inspectTemplates);
router.post('/templates/import', ADMIN, PRO, xlsxUpload, c.importTemplateGrades);
router.post('/templates/fill', OFFICE, PRO, xlsxUpload, c.fillTemplates);

export { router as siagieRouter };
