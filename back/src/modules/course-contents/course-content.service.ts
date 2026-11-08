import { CourseContentRepository } from './course-content.repository';
import type {
  CreateCourseContentDto,
  SupervisionFilterDto,
  SubmitHomeworkDto,
  GradeSubmissionDto,
} from './course-content.schema';
import { prisma } from '../../config/prisma';
import { AppError } from '../../core/errors/app-error';

export class CourseContentService {
  constructor(private readonly repository: CourseContentRepository) {}

  async getByAssignment(schoolId: string, courseAssignmentId: string, bimester?: number) {
    const assignment = await this.repository.findAssignmentById(schoolId, courseAssignmentId);
    if (!assignment) {
      throw new AppError('Asignación de curso no encontrada o no pertenece a tu colegio.', 404);
    }

    const contents = await this.repository.findByAssignment(schoolId, courseAssignmentId, bimester);
    return {
      assignment: {
        id: assignment.id,
        areaName: assignment.area.name,
        classroomLabel: `${assignment.classroom.grade}° "${assignment.classroom.section}" - ${assignment.classroom.educationLevel}`,
        teacher: assignment.teacher,
      },
      bimester: bimester || null,
      contents,
    };
  }

  async getById(schoolId: string, id: string) {
    const content = await this.repository.findById(schoolId, id);
    if (!content) {
      throw new AppError('Publicación no encontrada.', 404);
    }
    return content;
  }

  async create(schoolId: string, user: { id: string; role: string }, data: CreateCourseContentDto) {
    const assignment = await this.repository.findAssignmentById(schoolId, data.courseAssignmentId);
    if (!assignment) {
      throw new AppError('Asignación de curso no encontrada en tu institución.', 404);
    }

    // Si es docente, solo puede publicar en sus propios cursos
    if (user.role === 'TEACHER' && assignment.teacherId !== user.id) {
      throw new AppError('No tienes permisos para publicar en un curso asignado a otro docente.', 403);
    }

    return this.repository.create(schoolId, user.id, data);
  }

  async delete(schoolId: string, user: { id: string; role: string }, id: string) {
    const content = await this.repository.findById(schoolId, id);
    if (!content) {
      throw new AppError('Publicación no encontrada.', 404);
    }

    const isAdmin = user.role === 'SCHOOL_ADMIN' || user.role === 'SUPER_ADMIN' || user.role === 'ADMINISTRATIVE';
    if (!isAdmin && content.teacherId !== user.id) {
      throw new AppError('No tienes permisos para eliminar esta publicación.', 403);
    }

    await this.repository.delete(schoolId, id);
    return { success: true, message: 'Publicación eliminada correctamente.' };
  }

  async getComments(schoolId: string, courseContentId: string) {
    const content = await this.repository.findById(schoolId, courseContentId);
    if (!content) {
      throw new AppError('Publicación no encontrada.', 404);
    }

    if (content.contentType !== 'FORUM') {
      throw new AppError('Esta publicación no es un foro de discusión.', 400);
    }

    return this.repository.findComments(schoolId, courseContentId);
  }

  async addComment(schoolId: string, userId: string, courseContentId: string, content: string) {
    const forum = await this.repository.findById(schoolId, courseContentId);
    if (!forum) {
      throw new AppError('Foro de discusión no encontrado.', 404);
    }

    if (forum.contentType !== 'FORUM') {
      throw new AppError('Solo se pueden agregar comentarios a publicaciones de tipo FORO.', 400);
    }

    return this.repository.addComment(schoolId, courseContentId, userId, content);
  }

  async getStudentCourses(
    schoolId: string,
    studentId: string,
    user?: { id: string; role: string; studentId?: string },
  ) {
    if (user?.role === 'STUDENT') {
      const callerStudentId = user.studentId || user.id;
      if (callerStudentId !== studentId) {
        throw new AppError('No tienes permiso para consultar cursos de otro estudiante.', 403);
      }
    }
    const studentData = await this.repository.findStudentCourses(schoolId, studentId);
    if (!studentData) {
      throw new AppError('El estudiante no cuenta con matrícula activa para este ciclo escolar.', 404);
    }
    return studentData;
  }

  async getStudentTasks(
    schoolId: string,
    studentId: string,
    user?: { id: string; role: string; studentId?: string },
  ) {
    if (user?.role === 'STUDENT') {
      const callerStudentId = user.studentId || user.id;
      if (callerStudentId !== studentId) {
        throw new AppError('No tienes permiso para consultar tareas de otro estudiante.', 403);
      }
    }
    return this.repository.findStudentTasks(schoolId, studentId);
  }

  async getSupervisionStats(schoolId: string, bimester?: number) {
    return this.repository.getSupervisionStats(schoolId, bimester);
  }

  async getTeacherCompliance(schoolId: string, bimester?: number) {
    return this.repository.getTeacherCompliance(schoolId, bimester);
  }

  async getSupervisedFeed(schoolId: string, filters: SupervisionFilterDto) {
    return this.repository.findSupervisedFeed(schoolId, filters);
  }

  // ==========================================
  // LMS TAREAS / HOMEWORK SUBMISSIONS
  // ==========================================

  async submitHomework(
    schoolId: string,
    user: { id: string; role: string; studentId?: string },
    courseContentId: string,
    data: SubmitHomeworkDto,
  ) {
    const content = await this.repository.findById(schoolId, courseContentId);
    if (!content) {
      throw new AppError('Publicación de tarea no encontrada.', 404);
    }
    if (content.contentType !== 'HOMEWORK') {
      throw new AppError('Esta publicación no es de tipo tarea (HOMEWORK).', 400);
    }

    let enrollmentId: string | null = null;
    const classroomId = content.courseAssignment.classroomId;

    if (user.role === 'STUDENT') {
      const studentId = user.studentId || user.id;
      const enrollment = await this.repository.findEnrollmentByStudent(schoolId, studentId, classroomId);
      if (!enrollment) {
        throw new AppError('No estás matriculado en el aula correspondiente a esta tarea o el año escolar no está activo.', 403);
      }
      enrollmentId = enrollment.id;
    } else if (user.role === 'PARENT') {
      if (data.enrollmentId) {
        // Validar que la matrícula enviada pertenezca a un hijo del apoderado en esta aula
        const validEnrollment = await prisma.enrollment.findFirst({
          where: {
            id: data.enrollmentId,
            schoolId,
            classroomId,
            isActive: true,
            academicYear: { isActive: true },
            enrollmentState: 'REGISTERED',
            student: {
              familyRelations: {
                some: { userId: user.id },
              },
            },
          },
        });
        if (!validEnrollment) {
          throw new AppError('La matrícula especificada no es válida para esta tarea o no corresponde a su hijo.', 403);
        }
        enrollmentId = validEnrollment.id;
      } else {
        const targetStudentId = data.studentId || null;
        const parentEnrollments = await this.repository.findEnrollmentsByParent(
          schoolId,
          user.id,
          classroomId,
          targetStudentId,
        );
        if (parentEnrollments.length === 0) {
          throw new AppError('No tienes hijos con matrícula activa en el aula de esta tarea.', 403);
        }
        if (parentEnrollments.length > 1 && !targetStudentId) {
          throw new AppError('Debe especificar el hijo (studentId) para el cual realiza la entrega de tarea.', 400);
        }
        enrollmentId = parentEnrollments[0].id;
      }
    } else {
      throw new AppError('Solo estudiantes o apoderados pueden enviar tareas.', 403);
    }

    const now = new Date();
    const isLate = content.dueDate ? now > new Date(content.dueDate) : false;

    return this.repository.upsertSubmission({
      schoolId,
      courseContentId,
      enrollmentId,
      fileUrl: data.fileUrl,
      fileName: data.fileName,
      fileSize: data.fileSize,
      studentComment: data.studentComment,
      isLate,
    });
  }

  async getSubmissions(
    schoolId: string,
    user: { id: string; role: string; studentId?: string },
    courseContentId: string,
  ) {
    const content = await this.repository.findById(schoolId, courseContentId);
    if (!content) {
      throw new AppError('Publicación no encontrada.', 404);
    }
    if (content.contentType !== 'HOMEWORK') {
      throw new AppError('Esta publicación no es una tarea.', 400);
    }

    const classroomId = content.courseAssignment.classroomId;
    const isStaff =
      user.role === 'TEACHER' ||
      user.role === 'SCHOOL_ADMIN' ||
      user.role === 'SUPER_ADMIN' ||
      user.role === 'ADMINISTRATIVE';

    if (isStaff) {
      if (user.role === 'TEACHER' && content.teacherId !== user.id) {
        throw new AppError('No tienes permisos para ver entregas de otro docente.', 403);
      }

      const enrollments = await this.repository.findAllClassroomEnrollments(schoolId, classroomId);
      const submissions = await this.repository.findSubmissions(courseContentId);
      const submissionMap = new Map(submissions.map((s) => [s.enrollmentId, s]));

      const result = enrollments.map((enr) => {
        const sub = submissionMap.get(enr.id);
        return {
          enrollmentId: enr.id,
          student: enr.student,
          status: sub ? (sub.gradedAt ? 'CALIFICADA' : 'ENTREGADA') : 'PENDIENTE',
          submission: sub || null,
        };
      });

      return {
        courseContent: {
          id: content.id,
          title: content.title,
          dueDate: content.dueDate,
        },
        totalStudents: enrollments.length,
        submittedCount: submissions.length,
        items: result,
      };
    }

    if (user.role === 'STUDENT') {
      const studentId = user.studentId || user.id;
      const enrollment = await this.repository.findEnrollmentByStudent(schoolId, studentId, classroomId);
      if (!enrollment) {
        throw new AppError('No tienes acceso a esta tarea.', 403);
      }
      const submissions = await this.repository.findSubmissions(courseContentId, [enrollment.id]);
      return {
        courseContent: {
          id: content.id,
          title: content.title,
          dueDate: content.dueDate,
        },
        submission: submissions[0] || null,
      };
    }

    if (user.role === 'PARENT') {
      const parentEnrollments = await this.repository.findEnrollmentsByParent(schoolId, user.id, classroomId);
      const enrollmentIds = parentEnrollments.map((e) => e.id);
      const submissions = await this.repository.findSubmissions(courseContentId, enrollmentIds);
      return {
        courseContent: {
          id: content.id,
          title: content.title,
          dueDate: content.dueDate,
        },
        submissions,
      };
    }

    throw new AppError('Rol no autorizado para consultar entregas.', 403);
  }

  async gradeSubmission(
    schoolId: string,
    user: { id: string; role: string },
    submissionId: string,
    data: GradeSubmissionDto,
  ) {
    const submission = await this.repository.findSubmissionById(submissionId);
    if (!submission || submission.schoolId !== schoolId) {
      throw new AppError('Entrega de tarea no encontrada.', 404);
    }

    const isStaff =
      user.role === 'TEACHER' ||
      user.role === 'SCHOOL_ADMIN' ||
      user.role === 'SUPER_ADMIN';

    if (!isStaff) {
      throw new AppError('No tienes permisos para calificar entregas.', 403);
    }

    if (user.role === 'TEACHER' && submission.courseContent.teacherId !== user.id) {
      throw new AppError('Solo el docente asignado o la Dirección pueden calificar esta tarea.', 403);
    }

    const updated = await this.repository.gradeSubmission(submissionId, data);

    // Notificación In-App al apoderado / estudiante
    const scoreLabel = updated.literalScore
      ? updated.literalScore
      : updated.numericScore !== null && updated.numericScore !== undefined
      ? `${updated.numericScore}/20`
      : 'Calificada';

    const feedbackText = updated.teacherFeedback ? ` Comentario: "${updated.teacherFeedback}"` : '';
    const message = `Se ha calificado la tarea "${submission.courseContent.title}". Nota: ${scoreLabel}.${feedbackText}`;

    const parents = submission.enrollment?.student?.familyRelations || [];
    for (const p of parents) {
      if (p.userId) {
        await prisma.notification.create({
          data: {
            schoolId,
            userId: p.userId,
            title: `Tarea Calificada: ${submission.courseContent.title}`,
            message,
            type: 'ACADEMIC',
            link: '/parent/grades',
          },
        }).catch((err) => console.error('[HomeworkGradedNotifyParentError]:', err));
      }
    }

    // Notificación directa al estudiante
    if (submission.enrollment?.studentId) {
      await prisma.notification.create({
        data: {
          schoolId,
          studentId: submission.enrollment.studentId,
          title: `Tarea Calificada: ${submission.courseContent.title}`,
          message,
          type: 'ACADEMIC',
          link: '/virtual-classroom',
        },
      }).catch((err) => console.error('[HomeworkGradedNotifyStudentError]:', err));
    }

    return updated;
  }
}

