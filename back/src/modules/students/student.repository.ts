import { classroomYearService } from '../classrooms/classroom-year.service';
import { LEVEL_LABEL } from '../academic/cneb.catalog';
import { dateOnlyKey, getSchoolNow } from '../../utils/timezone.util';
import { prisma } from '../../config/prisma';
import type { Prisma, Student } from '@prisma/client';
import type { CreateStudentDto, UpdateStudentDto, StudentFilterDto, RegisterFichaMatriculaDto } from './student.schema';
import type { PaginatedResult } from '../../core/interfaces/global.interfaces';
import { AppError } from '../../core/errors/app-error';
import { enrollmentsOfYear } from '../../utils/academic-year-scope';
import { feeScheduleService, type ScheduleResult } from '../payments/fee-schedule.service';

export class StudentRepository {
  async findAllBySchool(
    schoolId: string,
    filters: StudentFilterDto = { page: 1, limit: 10 },
  ): Promise<PaginatedResult<Student>> {
    const { page, limit, search, classroomId, educationLevel, grade, section, academicYearId, scope, actorRole, actorUserId } = filters;
    const skip = (page - 1) * limit;

    let teacherClassroomIds: string[] | undefined = undefined;
    if (actorRole === 'TEACHER' && actorUserId) {
      const teacherClassrooms = await prisma.classroom.findMany({
        where: {
          schoolId,
          OR: [
            { tutorTeacherId: actorUserId },
            { years: { some: { tutorTeacherId: actorUserId, ...(academicYearId ? { academicYearId } : {}) } } },
            { assignments: { some: { teacherId: actorUserId, deletedAt: null, ...(academicYearId ? { academicYearId } : {}) } } },
          ],
        },
        select: { id: true },
      });
      teacherClassroomIds = teacherClassrooms.map((c) => c.id);
      if (teacherClassroomIds.length === 0) {
        return {
          data: [],
          meta: { total: 0, page, limit, totalPages: 1 },
        };
      }
    }

    // Matrículas del año elegido en la cabecera (o las vigentes si no se eligió año)
    const ofYear = enrollmentsOfYear(academicYearId);
    const hasClassroomFilter = Boolean(classroomId || educationLevel || grade !== undefined || section);

    let effectiveClassroomId: Prisma.StringFilter | string | undefined = classroomId;
    if (teacherClassroomIds !== undefined) {
      if (classroomId) {
        if (!teacherClassroomIds.includes(classroomId)) {
          return {
            data: [],
            meta: { total: 0, page, limit, totalPages: 1 },
          };
        }
        effectiveClassroomId = classroomId;
      } else {
        effectiveClassroomId = { in: teacherClassroomIds };
      }
    }

    const where: Prisma.StudentWhereInput = {
      schoolId,
      // Con año elegido o para docente, la lista es "matriculados en ese año"
      ...(hasClassroomFilter || (academicYearId && scope !== 'all') || teacherClassroomIds !== undefined
        ? {
            enrollments: {
              some: {
                ...ofYear,
                ...(effectiveClassroomId ? { classroomId: effectiveClassroomId } : {}),
                ...(educationLevel || grade !== undefined || section
                  ? {
                      classroom: {
                        ...(educationLevel ? { educationLevel } : {}),
                        ...(grade !== undefined ? { grade } : {}),
                        ...(section ? { section } : {}),
                      },
                    }
                  : {}),
              },
            },
          }
        : {}),
      // "Matriculados" del año vigente (sin año elegido): sin los retirados o trasladados de este año
      ...(scope !== 'all' && !academicYearId && !hasClassroomFilter && teacherClassroomIds === undefined
        ? { NOT: { enrollments: { some: { academicYear: { isActive: true }, enrollmentState: { not: 'REGISTERED' } } } } }
        : {}),
      ...(search
        ? {
            OR: [
              { firstNames: { contains: search, mode: 'insensitive' } },
              { lastNamePaternal: { contains: search, mode: 'insensitive' } },
              { lastNameMaternal: { contains: search, mode: 'insensitive' } },
              { documentId: { contains: search } },
              { studentCode: { contains: search } },
            ],
          }
        : {}),
    };

    const [rawStudents, total] = await Promise.all([
      prisma.student.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ lastNamePaternal: 'asc' }, { firstNames: 'asc' }],
        include: {
          familyRelations: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastNamePaternal: true,
                  lastNameMaternal: true,
                  documentType: true,
                  documentId: true,
                  email: true,
                  cellphone: true,
                  educationLevel: true,
                },
              },
            },
          },
          enrollments: {
            // También la matrícula retirada o trasladada del año, para mostrarla y poder reincorporar
            where: academicYearId ? { academicYearId } : { academicYear: { isActive: true } },
            include: {
              academicYear: true,
              classroom: {
                select: {
                  id: true,
                  educationLevel: true,
                  grade: true,
                  section: true,
                  shift: true,
                },
              },
            },
          },
        },
      }),
      prisma.student.count({ where }),
    ]);

    const data =
      actorRole === 'TEACHER'
        ? rawStudents.map((s) => ({
            ...s,
            familyRelations: s.familyRelations.map((fr) => ({
              ...fr,
              user: fr.user
                ? {
                    ...fr.user,
                    documentId: '',
                    cellphone: '',
                    email: '',
                  }
                : fr.user,
            })),
          }))
        : rawStudents;

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async findById(studentId: string, schoolId: string): Promise<Student | null> {
    return prisma.student.findFirst({
      where: { id: studentId, schoolId },
      include: {
        familyRelations: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastNamePaternal: true,
                lastNameMaternal: true,
                documentType: true,
                documentId: true,
                email: true,
                cellphone: true,
                educationLevel: true,
              },
            },
          },
        },
        enrollments: {
          orderBy: { enrollmentDate: 'desc' },
          include: {
            academicYear: true,
            classroom: true,
          },
        },
      },
    });
  }

  async findByDocumentId(schoolId: string, documentId: string): Promise<Student | null> {
    return prisma.student.findFirst({
      where: { schoolId, documentId },
    });
  }

  async findByStudentCode(schoolId: string, studentCode: string): Promise<Student | null> {
    return prisma.student.findFirst({
      where: { schoolId, studentCode },
    });
  }

  async countBySchool(schoolId: string): Promise<number> {
    return prisma.student.count({
      where: { schoolId },
    });
  }

  async findStudentForCertificate(studentId: string, schoolId: string) {
    return prisma.student.findFirst({
      where: { id: studentId, schoolId },
      include: {
        school: true,
        familyRelations: true,
        enrollments: {
          where: {
            isActive: true,
            academicYear: { isActive: true },
            enrollmentState: 'REGISTERED',
          },
          include: {
            academicYear: true,
            classroom: true,
          },
          orderBy: { enrollmentDate: 'desc' },
        },
      },
    });
  }

  async countStudentPendingObligations(studentId: string, schoolId: string): Promise<number> {
    const today = getSchoolNow().dateObj;
    return prisma.paymentObligation.count({
      where: {
        schoolId,
        enrollment: {
          studentId,
        },
        status: { in: ['PENDING', 'PARTIAL'] },
        dueDate: { lt: today },
      },
    });
  }

  async getSchoolPlan(schoolId: string): Promise<string> {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { plan: true },
    });
    return school?.plan || 'BASIC';
  }

  async create(schoolId: string, data: CreateStudentDto): Promise<Student> {
    return prisma.student.create({
      data: {
        ...data,
        schoolId,
        birthDate: new Date(data.birthDate),
      },
    });
  }

  async update(
    studentId: string,
    schoolId: string,
    data: UpdateStudentDto,
  ): Promise<Student> {
    return prisma.student.update({
      where: { id: studentId, schoolId },
      data: {
        ...data,
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
      },
    });
  }

  async delete(studentId: string, schoolId: string): Promise<Student> {
    return prisma.student.delete({
      where: { id: studentId, schoolId },
    });
  }

  async updatePassword(studentId: string, schoolId: string, passwordHash: string): Promise<void> {
    await prisma.student.update({
      where: { id: studentId, schoolId },
      data: {
        passwordHash,
        mustChangePassword: true,
        passwordChangedAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
  }

  /**
   * Registra atómicamente la Ficha de Matrícula SIAGIE
   * (Crea/Actualiza Alumno + Matrícula en Año/Aula + Apoderado)
   */
  async registerFichaMatricula(
    schoolId: string,
    data: RegisterFichaMatriculaDto,
    guardianPasswordHash: string,
    studentPasswordHash: string,
  ): Promise<{ student: Student; enrollmentId: string; schedule: ScheduleResult; guardianCreated: boolean }> {
    return prisma.$transaction(async (tx) => {
      let guardianCreated = false;
      // 1. Verificar si ya existe estudiante con ese documento en el colegio
      let student = await tx.student.findFirst({
        where: {
          schoolId,
          documentId: data.student.documentId,
        },
      });

      if (!student) {
        student = await tx.student.create({
          data: {
            ...data.student,
            schoolId,
            birthDate: new Date(data.student.birthDate),
            passwordHash: studentPasswordHash,
            mustChangePassword: true,
          },
        });
      } else {
        // Actualizar datos demográficos del estudiante con los de la ficha
        student = await tx.student.update({
          where: { id: student.id },
          data: {
            ...data.student,
            birthDate: new Date(data.student.birthDate),
          },
        });
      }

      // 2. Validar que no esté ya matriculado en este año lectivo
      const existingEnrollment = await tx.enrollment.findUnique({
        where: {
          studentId_academicYearId: {
            studentId: student.id,
            academicYearId: data.enrollment.academicYearId,
          },
        },
      });

      if (existingEnrollment) {
        throw new AppError(
          'El estudiante ya cuenta con matrícula registrada para este año lectivo.',
          409,
        );
      }

      // Crear Matrícula (vigente solo si el año es el activo)
      await classroomYearService.assertOpen(tx, schoolId, data.enrollment.classroomId, data.enrollment.academicYearId);
      await classroomYearService.assertHasVacancy(tx, schoolId, data.enrollment.classroomId, data.enrollment.academicYearId);
      const enrollmentYear = await tx.academicYear.findFirst({
        where: { id: data.enrollment.academicYearId, schoolId },
        select: { isActive: true },
      });
      const enrollment = await tx.enrollment.create({
        data: {
          schoolId,
          isActive: !!enrollmentYear?.isActive,
          studentId: student.id,
          academicYearId: data.enrollment.academicYearId,
          classroomId: data.enrollment.classroomId,
          condition: data.enrollment.condition,
          previousSchoolModularCode: data.enrollment.previousSchoolModularCode || null,
          repeatingGrade: data.enrollment.repeatingGrade,
        },
      });
      // Cronograma de cuotas del tarifario, en la misma transacción
      const schedule = await feeScheduleService.generateForEnrollmentInTx(tx, schoolId, enrollment.id);

      // 3. Manejo de Apoderado
      let parentUserId = data.guardian.existingUserId;

      if (data.guardian.mode === 'NEW' && data.guardian.newGuardian) {
        const guardianEmail = data.guardian.newGuardian.email?.toLowerCase().trim() || null;
        const guardianDocumentId = data.guardian.newGuardian.documentId?.trim() || null;

        // Mismo apoderado ya registrado: por correo (único en la plataforma) o por documento en este colegio
        const existingByEmail = guardianEmail
          ? await tx.user.findUnique({ where: { email: guardianEmail } })
          : null;
        if (existingByEmail && existingByEmail.schoolId !== schoolId) {
          throw new AppError('Ese correo ya está registrado en otra institución. Usa otro correo o déjalo vacío.', 409);
        }
        const existingUser =
          existingByEmail ??
          (guardianDocumentId
            ? await tx.user.findFirst({ where: { schoolId, documentId: guardianDocumentId } })
            : null);

        if (existingUser) {
          if (existingUser.role !== 'PARENT') {
            throw new AppError('Ese correo o documento pertenece a un miembro del personal, no a un apoderado.', 409);
          }
          parentUserId = existingUser.id;
        } else {
          const newParent = await tx.user.create({
            data: {
              schoolId,
              email: guardianEmail,
              passwordHash: guardianPasswordHash,
              mustChangePassword: true,
              firstName: data.guardian.newGuardian.firstName!,
              lastNamePaternal: data.guardian.newGuardian.lastNamePaternal!,
              lastNameMaternal: data.guardian.newGuardian.lastNameMaternal || '',
              role: 'PARENT',
              documentType: data.guardian.newGuardian.documentType || 'DNI',
              documentId: guardianDocumentId,
              cellphone: data.guardian.newGuardian.cellphone || null,
              educationLevel: data.guardian.newGuardian.educationLevel || null,
            },
          });
          parentUserId = newParent.id;
          guardianCreated = true;
        }
      }

      if (parentUserId) {
        await tx.familyRelationship.upsert({
          where: {
            studentId_userId: {
              studentId: student.id,
              userId: parentUserId,
            },
          },
          update: {
            relationshipType: data.guardian.relationshipType,
            isLegalGuardian: data.guardian.isLegalGuardian,
            isFinancialResponsible: data.guardian.isFinancialResponsible,
            livesWithStudent: data.guardian.livesWithStudent,
          },
          create: {
            studentId: student.id,
            userId: parentUserId,
            relationshipType: data.guardian.relationshipType,
            isLegalGuardian: data.guardian.isLegalGuardian,
            isFinancialResponsible: data.guardian.isFinancialResponsible,
            livesWithStudent: data.guardian.livesWithStudent,
          },
        });
      }

      return {
        student,
        enrollmentId: enrollment.id,
        schedule,
        guardianCreated,
      };
    });
  }

  async getNominaByClassroom(schoolId: string, classroomId: string) {
    const classroom = await prisma.classroom.findFirst({
      where: { id: classroomId, schoolId },
      include: {
        school: {
          select: {
            id: true,
            name: true,
            modularCode: true,
            localCode: true,
            department: true,
            province: true,
            district: true,
            address: true,
          },
        },
        tutorTeacher: {
          select: {
            id: true,
            firstName: true,
            lastNamePaternal: true,
            lastNameMaternal: true,
          },
        },
      },
    });

    if (!classroom) {
      throw new AppError('Aula no encontrada o no pertenece a la institución educativa', 404);
    }

    const enrollments = await prisma.enrollment.findMany({
      where: {
        schoolId,
        classroomId,
        isActive: true,
      },
      include: {
        academicYear: {
          select: {
            id: true,
            year: true,
            name: true,
          },
        },
        student: {
          include: {
            familyRelations: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastNamePaternal: true,
                    lastNameMaternal: true,
                    documentType: true,
                    documentId: true,
                    cellphone: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [
        { student: { lastNamePaternal: 'asc' } },
        { student: { lastNameMaternal: 'asc' } },
        { student: { firstNames: 'asc' } },
      ],
    });

    return {
      classroom,
      enrollments,
    };
  }

  async findMyChildren(schoolId: string, parentUserId: string) {
    const students = await prisma.student.findMany({
      where: {
        schoolId,
        familyRelations: {
          some: {
            userId: parentUserId,
          },
        },
      },
      include: {
        familyRelations: {
          where: { userId: parentUserId },
          select: {
            relationshipType: true,
            isLegalGuardian: true,
            isFinancialResponsible: true,
          },
        },
        enrollments: {
          where: {
            isActive: true,
            enrollmentState: 'REGISTERED',
            academicYear: { isActive: true },
          },
          orderBy: { enrollmentDate: 'desc' },
          take: 1,
          include: {
            classroom: {
              include: {
                tutorTeacher: {
                  select: {
                    id: true,
                    firstName: true,
                    lastNamePaternal: true,
                    lastNameMaternal: true,
                    cellphone: true,
                    email: true,
                    avatarUrl: true,
                  },
                },
              },
            },
            academicYear: true,
            obligations: {
              where: { status: { in: ['PENDING', 'PARTIAL'] } },
              orderBy: { dueDate: 'asc' },
            },
            attendances: {
              orderBy: { date: 'desc' },
              take: 31,
            },
          },
        },
      },
      orderBy: [{ lastNamePaternal: 'asc' }, { firstNames: 'asc' }],
    });

    const todayKey = getSchoolNow().dateStr;

    return students.map((student) => {
      const activeEnrollment = student.enrollments[0] || null;
      const relationship = student.familyRelations[0] || null;

      const attendances = activeEnrollment?.attendances || [];
      const todayAttendance = attendances.find((a) => {
        return dateOnlyKey(new Date(a.date)) === todayKey;
      });

      const totalRecordedAttendances = attendances.length;
      const presentCount = attendances.filter(
        (a) => a.status === 'PRESENT' || a.status === 'LATE_JUSTIFIED',
      ).length;
      const lateCount = attendances.filter(
        (a) => a.status === 'LATE_UNJUSTIFIED' || a.status === 'LATE_JUSTIFIED',
      ).length;
      const absentCount = attendances.filter(
        (a) => a.status === 'ABSENT_UNJUSTIFIED' || a.status === 'ABSENT_JUSTIFIED',
      ).length;

      const attendancePercentage =
        totalRecordedAttendances > 0
          ? Math.round((presentCount / totalRecordedAttendances) * 100)
          : 100;

      const pendingObligations = activeEnrollment?.obligations || [];
      const totalPendingAmount = Math.round(
        pendingObligations.reduce((sum, ob) => sum + Number(ob.amountDue), 0) * 100
      ) / 100;
      const nextPendingObligation = pendingObligations[0] || null;

      return {
        id: student.id,
        firstNames: student.firstNames,
        lastNamePaternal: student.lastNamePaternal,
        lastNameMaternal: student.lastNameMaternal || '',
        fullName: `${student.lastNamePaternal} ${student.lastNameMaternal || ''}, ${student.firstNames}`.trim(),
        documentType: student.documentType,
        documentId: student.documentId,
        studentCode: student.studentCode,
        gender: student.gender,
        relationshipType: relationship?.relationshipType || 'OTHER',
        isLegalGuardian: relationship?.isLegalGuardian ?? false,
        isFinancialResponsible: relationship?.isFinancialResponsible ?? false,
        activeEnrollment: activeEnrollment
          ? {
              id: activeEnrollment.id,
              academicYear: activeEnrollment.academicYear.year,
              classroom: {
                id: activeEnrollment.classroom.id,
                grade: activeEnrollment.classroom.grade,
                section: activeEnrollment.classroom.section,
                educationLevel: activeEnrollment.classroom.educationLevel,
                shift: activeEnrollment.classroom.shift,
                label: `${activeEnrollment.classroom.grade}° "${activeEnrollment.classroom.section}" - ${LEVEL_LABEL[activeEnrollment.classroom.educationLevel]}`,
                tutor: activeEnrollment.classroom.tutorTeacher
                  ? {
                      fullName: `${activeEnrollment.classroom.tutorTeacher.firstName} ${activeEnrollment.classroom.tutorTeacher.lastNamePaternal}`,
                      cellphone: activeEnrollment.classroom.tutorTeacher.cellphone,
                      email: activeEnrollment.classroom.tutorTeacher.email,
                      avatarUrl: activeEnrollment.classroom.tutorTeacher.avatarUrl,
                    }
                  : null,
              },
              attendanceSummary: {
                todayStatus: todayAttendance ? todayAttendance.status : 'NOT_RECORDED',
                todayCheckIn: todayAttendance?.checkInTime || null,
                attendancePercentage,
                presentCount,
                lateCount,
                absentCount,
                totalRecorded: totalRecordedAttendances,
              },
              financialSummary: {
                hasPending: pendingObligations.length > 0,
                pendingCount: pendingObligations.length,
                totalPendingAmount,
                nextDueDate: nextPendingObligation?.dueDate || null,
                nextTitle: nextPendingObligation?.title || null,
              },
            }
          : null,
      };
    });
  }

  /**
   * Retorna el perfil y matrícula activa del estudiante autenticado (Rol STUDENT)
   * Omitiendo detalles financieros por privacidad.
   */
  async findStudentSelf(schoolId: string, studentId: string) {
    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        schoolId,
      },
      include: {
        familyRelations: {
          select: {
            relationshipType: true,
            isLegalGuardian: true,
            isFinancialResponsible: true,
          },
        },
        enrollments: {
          where: {
            isActive: true,
            enrollmentState: 'REGISTERED',
            academicYear: { isActive: true },
          },
          orderBy: { enrollmentDate: 'desc' },
          take: 1,
          include: {
            classroom: {
              include: {
                tutorTeacher: {
                  select: {
                    id: true,
                    firstName: true,
                    lastNamePaternal: true,
                    lastNameMaternal: true,
                    cellphone: true,
                    email: true,
                    avatarUrl: true,
                  },
                },
              },
            },
            academicYear: true,
            attendances: {
              orderBy: { date: 'desc' },
              take: 31,
            },
          },
        },
      },
    });

    if (!student) return null;

    const todayKey = getSchoolNow().dateStr;

    const activeEnrollment = student.enrollments[0] || null;

    const attendances = activeEnrollment?.attendances || [];
    const todayAttendance = attendances.find((a) => {
      return dateOnlyKey(new Date(a.date)) === todayKey;
    });

    const totalRecordedAttendances = attendances.length;
    const presentCount = attendances.filter(
      (a) => a.status === 'PRESENT' || a.status === 'LATE_JUSTIFIED',
    ).length;
    const lateCount = attendances.filter(
      (a) => a.status === 'LATE_UNJUSTIFIED' || a.status === 'LATE_JUSTIFIED',
    ).length;
    const absentCount = attendances.filter(
      (a) => a.status === 'ABSENT_UNJUSTIFIED' || a.status === 'ABSENT_JUSTIFIED',
    ).length;

    const attendancePercentage =
      totalRecordedAttendances > 0
        ? Math.round((presentCount / totalRecordedAttendances) * 100)
        : 100;

    return {
      id: student.id,
      firstNames: student.firstNames,
      lastNamePaternal: student.lastNamePaternal,
      lastNameMaternal: student.lastNameMaternal || '',
      fullName: `${student.lastNamePaternal} ${student.lastNameMaternal || ''}, ${student.firstNames}`.trim(),
      documentType: student.documentType,
      documentId: student.documentId,
      studentCode: student.studentCode,
      gender: student.gender,
      relationshipType: 'STUDENT',
      isLegalGuardian: false,
      isFinancialResponsible: false,
      activeEnrollment: activeEnrollment
        ? {
            id: activeEnrollment.id,
            academicYear: activeEnrollment.academicYear.year,
            classroom: {
              id: activeEnrollment.classroom.id,
              grade: activeEnrollment.classroom.grade,
              section: activeEnrollment.classroom.section,
              educationLevel: activeEnrollment.classroom.educationLevel,
              shift: activeEnrollment.classroom.shift,
              label: `${activeEnrollment.classroom.grade}° "${activeEnrollment.classroom.section}" - ${LEVEL_LABEL[activeEnrollment.classroom.educationLevel]}`,
              tutor: activeEnrollment.classroom.tutorTeacher
                ? {
                    fullName: `${activeEnrollment.classroom.tutorTeacher.firstName} ${activeEnrollment.classroom.tutorTeacher.lastNamePaternal}`,
                    cellphone: activeEnrollment.classroom.tutorTeacher.cellphone,
                    email: activeEnrollment.classroom.tutorTeacher.email,
                    avatarUrl: activeEnrollment.classroom.tutorTeacher.avatarUrl,
                  }
                : null,
            },
            attendanceSummary: {
              todayStatus: todayAttendance ? todayAttendance.status : 'NOT_RECORDED',
              todayCheckIn: todayAttendance?.checkInTime || null,
              attendancePercentage,
              presentCount,
              lateCount,
              absentCount,
              totalRecorded: totalRecordedAttendances,
            },
            financialSummary: {
              hasPending: false,
              pendingCount: 0,
              totalPendingAmount: 0,
              nextDueDate: null,
              nextTitle: null,
            },
          }
        : null,
    };
  }
}
