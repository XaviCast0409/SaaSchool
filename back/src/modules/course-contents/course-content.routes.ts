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
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER', 'PARENT', 'STUDENT'),
  controller.getStudentCourses,
);

// Tareas pendientes y foros activos del alumno
courseContentRouter.get(
  '/student/:studentId/tasks',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER', 'PARENT', 'STUDENT'),
  controller.getStudentTasks,
);

// Contenidos (Clases, Tareas, Foros) de un curso con filtro opcional ?bimester=1
courseContentRouter.get(
  '/assignment/:assignmentId',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER', 'PARENT', 'STUDENT'),
  controller.getByAssignment,
);

// ==========================================
// SUPERVISIÓN Y ANALÍTICA (DIRECCIÓN Y SECRETARÍA)
// ==========================================
courseContentRouter.get(
  '/supervision/stats',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'),
  controller.getSupervisionStats,
);

courseContentRouter.get(
  '/supervision/teacher-compliance',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'),
  controller.getTeacherCompliance,
);

courseContentRouter.get(
  '/supervision/feed',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'),
  controller.getSupervisedFeed,
);

// Detalle de una publicación específica
courseContentRouter.get(
  '/:id',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER', 'PARENT', 'STUDENT'),
  controller.getById,
);

// Crear publicación de clase, tarea o foro (Docentes y Dirección)
courseContentRouter.post(
  '/',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER'),
  controller.create,
);

// Eliminar publicación (Docente autor, Dirección o Secretaría)
courseContentRouter.delete(
  '/:id',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'),
  controller.delete,
);

// Comentarios / Respuestas de debate en un foro
courseContentRouter.get(
  '/:id/comments',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER', 'PARENT', 'STUDENT'),
  controller.getComments,
);

// Agregar comentario a un foro (Alumnos, Padres, Docentes)
courseContentRouter.post(
  '/:id/comments',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER', 'PARENT', 'STUDENT'),
  controller.addComment,
);

// ==========================================
// ENTREGAS DE TAREAS (LMS AULA VIRTUAL)
// ==========================================

// Enviar entrega de tarea (Estudiantes y Apoderados)
courseContentRouter.post(
  '/:id/submissions',
  authorizeRoles('STUDENT', 'PARENT', 'SUPER_ADMIN', 'SCHOOL_ADMIN'),
  controller.submitHomework,
);

// Consultar entregas de una tarea (Docente ve todos; Estudiante/Apoderado ve la propia)
courseContentRouter.get(
  '/:id/submissions',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER', 'STUDENT', 'PARENT'),
  controller.getSubmissions,
);

// Calificar entrega de tarea (Docente y Dirección)
courseContentRouter.patch(
  '/submissions/:submissionId/grade',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER'),
  controller.gradeSubmission,
);
