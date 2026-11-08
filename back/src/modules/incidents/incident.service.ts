import { AppError } from '../../core/errors/app-error';
import { prisma } from '../../config/prisma';
import type { IncidentRepository } from './incident.repository';
import type { CreateIncidentDto, IncidentFilterDto } from './incident.schema';
import { sendWebPushNotification } from '../../utils/web-push.util';

export interface IncidentUserContext {
  userId: string;
  role: string;
  studentId?: string;
}

export class IncidentService {
  constructor(private readonly incidentRepository: IncidentRepository) {}

  async createIncident(schoolId: string, authorId: string, dto: CreateIncidentDto) {
    let enrollmentId = dto.enrollmentId;

    if (!enrollmentId && dto.studentId) {
      const activeEnrollment = await prisma.enrollment.findFirst({
        where: {
          schoolId,
          studentId: dto.studentId,
          isActive: true,
          academicYear: { isActive: true },
          enrollmentState: 'REGISTERED',
        },
        select: { id: true },
      });

      if (!activeEnrollment) {
        const anyEnrollment = await prisma.enrollment.findFirst({
          where: { schoolId, studentId: dto.studentId, isActive: true },
          select: { id: true },
        });
        if (!anyEnrollment) {
          throw new AppError('No se encontró una matrícula activa para el estudiante.', 404);
        }
        enrollmentId = anyEnrollment.id;
      } else {
        enrollmentId = activeEnrollment.id;
      }
    }

    if (!enrollmentId) {
      throw new AppError('Se requiere el ID de matrícula del estudiante.', 400);
    }

    const incident = await this.incidentRepository.create(schoolId, authorId, enrollmentId, dto);

    // Obtener los datos del estudiante y familiares para notificaciones
    const enrollmentWithStudent = await prisma.enrollment.findFirst({
      where: { id: enrollmentId, schoolId },
      include: {
        student: {
          include: {
            familyRelations: {
              select: { userId: true },
            },
          },
        },
      },
    });

    if (enrollmentWithStudent?.student) {
      const student = enrollmentWithStudent.student;
      const studentName = `${student.firstNames} ${student.lastNamePaternal}`;
      const notifTitle = `Registro de Incidencia: ${studentName}`;
      const notifMessage = `Se registró una incidencia de tipo ${dto.type} (${dto.title}).`;

      // 1. Notificación in-app y push a los padres
      const parentUserIds = student.familyRelations
        .map((fr) => fr.userId)
        .filter((uid): uid is string => Boolean(uid));

      for (const parentId of parentUserIds) {
        // In-app
        await prisma.notification
          .create({
            data: {
              schoolId,
              userId: parentId,
              type: 'INCIDENT',
              title: notifTitle,
              message: notifMessage,
              link: '/parent-portal',
            },
          })
          .catch((err) => console.error('[IncidentNotifyParentError]:', err));

        // Web push
        const subscriptions = await prisma.pushSubscription.findMany({
          where: { schoolId, userId: parentId },
        });

        for (const sub of subscriptions) {
          try {
            const pushResult = await sendWebPushNotification(
              {
                endpoint: sub.endpoint,
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
              {
                title: notifTitle,
                message: notifMessage,
                type: 'INCIDENT',
                link: '/parent-portal',
              },
            );
            if (pushResult.shouldRemove) {
              await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
            }
          } catch (pushErr) {
            console.error('[IncidentWebPushError]:', pushErr);
          }
        }
      }

      // 2. Notificación in-app al estudiante
      await prisma.notification
        .create({
          data: {
            schoolId,
            studentId: student.id,
            type: 'INCIDENT',
            title: notifTitle,
            message: notifMessage,
            link: '/parent-portal',
          },
        })
        .catch((err) => console.error('[IncidentNotifyStudentError]:', err));
    }

    return incident;
  }

  async getIncidents(schoolId: string, filters: IncidentFilterDto, userContext: IncidentUserContext) {
    if (userContext.role === 'PARENT') {
      return this.incidentRepository.findAll(schoolId, filters, {
        parentUserId: userContext.userId,
      });
    }

    if (userContext.role === 'STUDENT') {
      const studentId = userContext.studentId || userContext.userId;
      return this.incidentRepository.findAll(schoolId, filters, {
        studentId,
      });
    }

    return this.incidentRepository.findAll(schoolId, filters);
  }

  async getIncidentById(schoolId: string, id: string, userContext: IncidentUserContext) {
    const incident = await this.incidentRepository.findById(schoolId, id);
    if (!incident) {
      throw new AppError('Incidencia no encontrada.', 404);
    }

    const incData = incident as any;
    if (userContext.role === 'STUDENT') {
      const studentId = userContext.studentId || userContext.userId;
      if (incData.enrollment?.student?.id !== studentId) {
        throw new AppError('No tienes permisos para ver esta incidencia.', 403);
      }
    } else if (userContext.role === 'PARENT') {
      const isParent = (incData.enrollment?.student?.familyRelations || []).some(
        (fr: { userId: string }) => fr.userId === userContext.userId,
      );
      if (!isParent) {
        throw new AppError('No tienes permisos para ver esta incidencia.', 403);
      }
    }

    return incident;
  }

  async acknowledgeIncident(schoolId: string, id: string, userId: string, role: string) {
    const incident = await this.incidentRepository.findById(schoolId, id);
    if (!incident) {
      throw new AppError('Incidencia no encontrada.', 404);
    }

    const incData = incident as any;
    if (role === 'PARENT') {
      const isParent = (incData.enrollment?.student?.familyRelations || []).some(
        (fr: { userId: string }) => fr.userId === userId,
      );
      if (!isParent) {
        throw new AppError('Solo los apoderados del estudiante pueden confirmar la recepción.', 403);
      }
    }

    return this.incidentRepository.acknowledge(schoolId, id, userId);
  }
}

