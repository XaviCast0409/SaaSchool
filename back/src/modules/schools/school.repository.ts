import { prisma } from '../../config/prisma';
import type { School } from '@prisma/client';
import type { CreateSchoolDto, UpdateSchoolDto } from './school.schema';
import { AppError } from '../../core/errors/app-error';
import { hashPassword } from '../../utils/hash.util';
import { generateTemporaryPassword, PASSWORD_POLICY_REGEX } from '../../utils/password.util';
import { invalidatePrincipalCache } from '../../core/security/principal-status';
import { invalidateSchoolStatus } from '../../core/security/school-status';
import { slugify, slugCandidates } from './school-slug.rules';

/**
 * SchoolRepository: Acceso a datos del modelo School.
 */
export class SchoolRepository {
  async findAll(): Promise<School[]> {
    return prisma.school.findMany({
      where: {
        documentId: { not: '00000000000' },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            users: true,
            students: true,
          },
        },
      },
    });
  }

  /**
   * Actividad y último pago por colegio para el panel SuperAdmin:
   * última actividad (personal, familias y alumnos) y cuentas activas en 7 y 30 días.
   */
  async activityBySchool(now: Date = new Date()): Promise<
    Map<string, { lastSeenAt: Date | null; active7d: number; active30d: number; lastPaymentOn: Date | null }>
  > {
    const since7 = new Date(now.getTime() - 7 * 86_400_000);
    const since30 = new Date(now.getTime() - 30 * 86_400_000);
    const staff = { role: { not: 'SUPER_ADMIN' as const } };

    const [userLast, user7, user30, studentLast, student7, student30, payments] = await Promise.all([
      prisma.user.groupBy({ by: ['schoolId'], where: { ...staff, lastSeenAt: { not: null } }, _max: { lastSeenAt: true } }),
      prisma.user.groupBy({ by: ['schoolId'], where: { ...staff, lastSeenAt: { gte: since7 } }, _count: { _all: true } }),
      prisma.user.groupBy({ by: ['schoolId'], where: { ...staff, lastSeenAt: { gte: since30 } }, _count: { _all: true } }),
      prisma.student.groupBy({ by: ['schoolId'], where: { lastSeenAt: { not: null } }, _max: { lastSeenAt: true } }),
      prisma.student.groupBy({ by: ['schoolId'], where: { lastSeenAt: { gte: since7 } }, _count: { _all: true } }),
      prisma.student.groupBy({ by: ['schoolId'], where: { lastSeenAt: { gte: since30 } }, _count: { _all: true } }),
      prisma.subscriptionPayment.groupBy({ by: ['schoolId'], where: { voidedAt: null }, _max: { paidOn: true } }),
    ]);

    const result = new Map<string, { lastSeenAt: Date | null; active7d: number; active30d: number; lastPaymentOn: Date | null }>();
    const entry = (schoolId: string) => {
      let e = result.get(schoolId);
      if (!e) {
        e = { lastSeenAt: null, active7d: 0, active30d: 0, lastPaymentOn: null };
        result.set(schoolId, e);
      }
      return e;
    };

    for (const row of [...userLast, ...studentLast]) {
      const e = entry(row.schoolId);
      const seen = row._max.lastSeenAt;
      if (seen && (!e.lastSeenAt || seen > e.lastSeenAt)) e.lastSeenAt = seen;
    }
    for (const row of [...user7, ...student7]) entry(row.schoolId).active7d += row._count._all;
    for (const row of [...user30, ...student30]) entry(row.schoolId).active30d += row._count._all;
    for (const row of payments) entry(row.schoolId).lastPaymentOn = row._max.paidOn;

    return result;
  }

  async findById(schoolId: string): Promise<School | null> {
    return prisma.school.findUnique({
      where: { id: schoolId },
      include: {
        _count: {
          select: {
            users: true,
            students: true,
          },
        },
      },
    });
  }

  async findByDocumentId(documentId: string): Promise<School | null> {
    return prisma.school.findFirst({
      where: { documentId },
    });
  }

  /** Primer código libre entre base, base-2, base-3... */
  async findAvailableSlug(base: string): Promise<string> {
    const candidates = slugCandidates(base);
    const taken = await prisma.school.findMany({ where: { slug: { in: candidates } }, select: { slug: true } });
    const used = new Set(taken.map((s) => s.slug));
    const free = candidates.find((c) => !used.has(c));
    return free ?? `${base}-${Date.now().toString(36)}`;
  }

  /** Imagen subida por el propio colegio (para el fondo de su página de ingreso). */
  async findSchoolImage(fileId: string, schoolId: string): Promise<{ id: string; mimeType: string } | null> {
    return prisma.storedFile.findFirst({
      where: { id: fileId, schoolId, deletedAt: null },
      select: { id: true, mimeType: true },
    });
  }

  async create(data: CreateSchoolDto): Promise<School> {
    const {
      planExpiresAt,
      adminEmail,
      adminPassword,
      adminFirstName,
      adminLastNamePaternal,
      adminLastNameMaternal,
      adminDocumentId,
      adminCellphone,
      slug,
      ...schoolData
    } = data;

    // Código de la página de ingreso: el indicado o uno libre derivado del nombre
    const finalSlug = slug ?? (await this.findAvailableSlug(slugify(schoolData.name)));

    return prisma.$transaction(async (tx) => {
      // 1. Crear el colegio cliente
      const school = await tx.school.create({
        data: {
          ...schoolData,
          slug: finalSlug,
          ...(planExpiresAt ? { planExpiresAt: new Date(planExpiresAt) } : {}),
        },
      });

      // 2. Si se pasaron credenciales para el Administrador Inicial, crear el usuario
      if (adminEmail) {
        // La clave ya viene validada (school.schema + school.service): se usa tal cual se le entrega al director
        if (!adminPassword) {
          throw new AppError('Indica la contraseña inicial del director.', 400);
        }
        const passwordHash = await hashPassword(adminPassword.trim());
        await tx.user.create({
          data: {
            schoolId: school.id,
            email: adminEmail.toLowerCase().trim(),
            passwordHash,
            mustChangePassword: true,
            firstName: adminFirstName || 'Director(a)',
            lastNamePaternal: adminLastNamePaternal || 'Director',
            lastNameMaternal: adminLastNameMaternal || '',
            role: 'SCHOOL_ADMIN',
            documentType: 'DNI',
            documentId: adminDocumentId || null,
            cellphone: adminCellphone || '',
          },
        });
      }

      return school;
    });
  }

  async update(schoolId: string, data: UpdateSchoolDto): Promise<School> {
    const { planExpiresAt, ...schoolData } = data;
    invalidateSchoolStatus(schoolId);

    return prisma.school.update({
      where: { id: schoolId },
      data: {
        ...schoolData,
        ...(planExpiresAt !== undefined
          ? { planExpiresAt: planExpiresAt ? new Date(planExpiresAt) : null }
          : {}),
      },
    });
  }

  async deactivate(schoolId: string): Promise<School> {
    invalidateSchoolStatus(schoolId);
    return prisma.school.update({
      where: { id: schoolId },
      data: { isActive: false },
    });
  }

  async reactivate(schoolId: string): Promise<School> {
    invalidateSchoolStatus(schoolId);
    return prisma.school.update({
      where: { id: schoolId },
      data: { isActive: true },
    });
  }

  async resetAdminPassword(
    schoolId: string,
    newPassword?: string,
  ): Promise<{ adminEmail: string; newPassword: string; adminName: string }> {
    const adminUser = await prisma.user.findFirst({
      where: { schoolId, role: 'SCHOOL_ADMIN', isActive: true },
      orderBy: { createdAt: 'asc' },
    });

    if (!adminUser) {
      throw new AppError('No se encontró un usuario Administrador activo para este colegio', 404);
    }

    const passwordToSet =
      newPassword && PASSWORD_POLICY_REGEX.test(newPassword.trim())
        ? newPassword.trim()
        : generateTemporaryPassword(12);

    const passwordHash = await hashPassword(passwordToSet);

    await prisma.user.update({
      where: { id: adminUser.id },
      data: {
        passwordHash,
        mustChangePassword: true,
        passwordChangedAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    invalidatePrincipalCache('user', adminUser.id);

    return {
      adminEmail: adminUser.email ?? '',
      newPassword: passwordToSet,
      adminName: `${adminUser.firstName} ${adminUser.lastNamePaternal}`,
    };
  }
}
