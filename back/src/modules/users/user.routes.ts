import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { AppError } from '../../core/errors/app-error';
import { recordAudit } from '../../utils/audit.util';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { authMiddleware, authorizeRoles } from '../../core/middlewares/auth.middleware';
import { tenantMiddleware } from '../../core/middlewares/tenant.middleware';
import { familyRelationshipController } from '../family-relationships/family-relationship.routes';
import { selectedAcademicYearId } from '../../utils/academic-year-scope';

const userRepository = new UserRepository();
const userService = new UserService(userRepository);
const userController = new UserController(userService);

export const userRouter = Router();

userRouter.use(authMiddleware, tenantMiddleware);

// CRUD de usuarios (Profesores, Padres, Admin)
userRouter.get('/', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'), userController.getAll);
userRouter.post('/', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'), userController.create);
// Personal del año elegido en la cabecera (o del vigente): carga docente y tutoría de cada docente
userRouter.get('/staff-load', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'), async (req: Request, res: Response) => {
  const schoolId = req.user!.schoolId;
  const yearId =
    (await selectedAcademicYearId(req)) ??
    (await prisma.academicYear.findFirst({ where: { schoolId, isActive: true }, select: { id: true } }))?.id;
  if (!yearId) throw new AppError('No hay año académico activo.', 400);
  const year = await prisma.academicYear.findUniqueOrThrow({ where: { id: yearId }, select: { id: true, year: true, isActive: true } });
  const [teachers, assignments, sections] = await Promise.all([
    prisma.user.findMany({
      where: { schoolId, role: 'TEACHER', isActive: true },
      select: { id: true, firstName: true, lastNamePaternal: true, lastNameMaternal: true, email: true },
      orderBy: [{ lastNamePaternal: 'asc' }, { firstName: 'asc' }],
    }),
    prisma.courseAssignment.findMany({
      where: { schoolId, academicYearId: year.id, deletedAt: null },
      select: { teacherId: true, classroomId: true },
    }),
    prisma.classroomYear.findMany({
      where: { schoolId, academicYearId: year.id, tutorTeacherId: { not: null } },
      select: { tutorTeacherId: true, classroom: { select: { educationLevel: true, grade: true, section: true } } },
    }),
  ]);
  // Sin secciones definidas para el año vigente, el tutor es el del aula
  const tutors =
    sections.length > 0 || !year.isActive
      ? sections.map((s) => ({ teacherId: s.tutorTeacherId!, classroom: s.classroom }))
      : (
          await prisma.classroom.findMany({
            where: { schoolId, tutorTeacherId: { not: null } },
            select: { tutorTeacherId: true, educationLevel: true, grade: true, section: true },
          })
        ).map((c) => ({ teacherId: c.tutorTeacherId!, classroom: c }));
  const rows = teachers.map((t) => {
    const mine = assignments.filter((a) => a.teacherId === t.id);
    const tutorOf = tutors.find((x) => x.teacherId === t.id)?.classroom ?? null;
    return { teacher: t, courses: mine.length, classrooms: new Set(mine.map((a) => a.classroomId)).size, tutorOf, hasLoad: mine.length > 0 || !!tutorOf };
  });
  res.status(200).json({
    status: 'success',
    data: { year: year.year, rows, withLoad: rows.filter((r) => r.hasLoad).length, withoutLoad: rows.filter((r) => !r.hasLoad).length },
  });
});

userRouter.get('/:id', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'), userController.getById);
userRouter.patch('/:id', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'), userController.update);
userRouter.delete('/:id', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN'), userController.deactivate);

// Rol en caja y tesorería (solo Dirección): cajero, tesorero o contador de solo lectura.
// Va aparte de la edición general para que nadie pueda subirse sus propios permisos.
userRouter.patch(
  '/:id/finance-role',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN'),
  async (req: Request, res: Response) => {
    const id = z.string().uuid().parse(req.params.id);
    const { financeRole } = z
      .object({ financeRole: z.enum(['CASHIER', 'TREASURER', 'ACCOUNTANT']).nullable() })
      .parse(req.body);
    const user = await prisma.user.findFirst({
      where: { id, schoolId: req.user!.schoolId },
      select: { id: true, role: true, financeRole: true },
    });
    if (!user) throw new AppError('Usuario no encontrado', 404);
    if (user.role !== 'ADMINISTRATIVE') {
      throw new AppError('El rol en finanzas solo se asigna al personal administrativo.', 400);
    }
    const updated = await prisma.user.update({ where: { id }, data: { financeRole }, select: { id: true, financeRole: true } });
    recordAudit(req, {
      action: 'USER_FINANCE_ROLE_CHANGED',
      entity: 'User',
      entityId: id,
      before: { rolFinanzas: user.financeRole },
      after: { rolFinanzas: financeRole },
    });
    res.status(200).json({ status: 'success', data: updated });
  },
);

// Reactivar usuario (undo del soft delete)
userRouter.patch(
  '/:id/reactivate',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN'),
  userController.reactivate,
);

// Restablecimiento de contraseña por Dirección / Secretaría (a DNI)
userRouter.post(
  '/:id/reset-password',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'),
  userController.resetPassword,
);

// Ruta anidada: alumnos/hijos de un apoderado
// GET /api/users/:userId/students
userRouter.get(
  '/:userId/students',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'),
  familyRelationshipController.getByParent,
);
