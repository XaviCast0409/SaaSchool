import { z } from 'zod';
import { recordAudit } from '../../utils/audit.util';
import { classroomYearService } from './classroom-year.service';
import { Router } from 'express';
import { ClassroomRepository } from './classroom.repository';
import { ClassroomService } from './classroom.service';
import { ClassroomController } from './classroom.controller';
import { authMiddleware, authorizeRoles } from '../../core/middlewares/auth.middleware';
import { tenantMiddleware } from '../../core/middlewares/tenant.middleware';

const classroomRepository = new ClassroomRepository();
const classroomService = new ClassroomService(classroomRepository);
const classroomController = new ClassroomController(classroomService);

export const classroomRouter = Router();

classroomRouter.use(authMiddleware, tenantMiddleware);

classroomRouter.get('/', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'), classroomController.getAll);
classroomRouter.post('/', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN'), classroomController.create);
classroomRouter.post('/bulk', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN'), classroomController.bulkCreate);
// Secciones por año: copiar las de otro año y abrir/cerrar una sección con sus vacantes y tutor
classroomRouter.post('/copy-year', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN'), async (req, res) => {
  const dto = z
    .object({ fromAcademicYearId: z.string().uuid(), toAcademicYearId: z.string().uuid(), includeTutors: z.boolean().default(false) })
    .parse(req.body);
  const result = await classroomYearService.copyYear(req.user!.schoolId, dto.fromAcademicYearId, dto.toAcademicYearId, dto.includeTutors);
  recordAudit(req, { action: 'CLASSROOM_YEAR_UPDATED', entity: 'AcademicYear', entityId: dto.toAcademicYearId, after: { copiadoDe: dto.fromAcademicYearId, ...result } });
  res.status(200).json({ status: 'success', data: result });
});

classroomRouter.put('/:id/years/:academicYearId', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN'), async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const academicYearId = z.string().uuid().parse(req.params.academicYearId);
  const dto = z
    .object({
      open: z.boolean(),
      capacity: z.number().int().min(1).max(60).optional(),
      tutorTeacherId: z.string().uuid().nullable().optional(),
    })
    .parse(req.body);
  const result = await classroomYearService.setSection(req.user!.schoolId, id, academicYearId, dto);
  recordAudit(req, { action: 'CLASSROOM_YEAR_UPDATED', entity: 'Classroom', entityId: id, after: { anio: academicYearId, ...dto } });
  res.status(200).json({ status: 'success', data: result });
});

classroomRouter.get('/:id', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'), classroomController.getById);
classroomRouter.patch('/:id', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN'), classroomController.update);
classroomRouter.delete('/:id', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN'), classroomController.delete);
