import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { authMiddleware, authorizeRoles } from '../../core/middlewares/auth.middleware';
import { tenantMiddleware } from '../../core/middlewares/tenant.middleware';
import { AppError } from '../../core/errors/app-error';
import { StudentImportRepository } from './student-import.repository';
import { StudentImportService } from './student-import.service';
import { StudentImportController } from './student-import.controller';

const controller = new StudentImportController(new StudentImportService(new StudentImportRepository()));

/** Carga masiva de alumnos desde la plantilla Excel. Se monta en /students/import, antes de /students/:id. */
export const studentImportRouter: Router = Router();
studentImportRouter.use(authMiddleware, tenantMiddleware);

const OFFICE = authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE');

/** El Excel se procesa en memoria y nunca se guarda en disco: trae datos personales de menores. */
const xlsxUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter: (_request, file, callback) => {
    if (path.extname(file.originalname).toLowerCase() === '.xlsx') callback(null, true);
    else callback(new AppError(`"${file.originalname}" no es un archivo .xlsx. Guarda la plantilla como Excel (.xlsx) y vuelve a subirla.`, 400));
  },
}).single('file');

studentImportRouter.get('/template', OFFICE, controller.template);
studentImportRouter.post('/preview', OFFICE, xlsxUpload, controller.preview);
studentImportRouter.post('/rejected', OFFICE, xlsxUpload, controller.rejected);
studentImportRouter.post('/commit', OFFICE, xlsxUpload, controller.commit);
