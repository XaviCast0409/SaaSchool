import { Router } from 'express';
import { CourseContentRepository } from './course-content.repository';
import { CourseContentService } from './course-content.service';
import { CourseContentController } from './course-content.controller';
import { authMiddleware, authorizeRoles } from '../../core/middlewares/auth.middleware';
import { tenantMiddleware } from '../../core/middlewares/tenant.middleware';

const repository = new CourseContentRepository();
const service = new CourseContentService(repository);
const controller = new CourseContentController(service);

export const courseContentRouter = Router();

courseContentRouter.use(authMiddleware, tenantMiddleware);

// Asignaturas y materias de un alumno (para portal de padres / alumnos)
courseContentRouter.get(
  '/student/:studentId/courses',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER', 'PARENT'),
  controller.getStudentCourses,
);

// Tareas pendientes y foros activos del alumno
courseContentRouter.get(
  '/student/:studentId/tasks',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER', 'PARENT'),
  controller.getStudentTasks,
);

// Contenidos (Clases, Tareas, Foros) de un curso con filtro opcional ?bimester=1
courseContentRouter.get(
  '/assignment/:assignmentId',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER', 'PARENT'),
  controller.getByAssignment,
);

// Detalle de una publicación específica
courseContentRouter.get(
  '/:id',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER', 'PARENT'),
  controller.getById,
);

// Crear publicación de clase, tarea o foro (Docentes y Dirección)
courseContentRouter.post(
  '/',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER'),
  controller.create,
);

// Eliminar publicación (Docente autor o Dirección)
courseContentRouter.delete(
  '/:id',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER'),
  controller.delete,
);

// Comentarios / Respuestas de debate en un foro
courseContentRouter.get(
  '/:id/comments',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER', 'PARENT'),
  controller.getComments,
);

// Agregar comentario a un foro (Alumnos, Padres, Docentes)
courseContentRouter.post(
  '/:id/comments',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER', 'PARENT'),
  controller.addComment,
);
