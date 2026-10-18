import { prisma } from '../../config/prisma';
import { Prisma } from '@prisma/client';
import type { CreateCourseContentDto, SupervisionFilterDto } from './course-content.schema';

export class CourseContentRepository {
  async findAssignmentById(schoolId: string, courseAssignmentId: string) {
    return prisma.courseAssignment.findFirst({
      where: {
        id: courseAssignmentId,
        schoolId,
      },
      include: {
        classroom: true,
        area: true,
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastNamePaternal: true,
            email: true,
          },
        },
      },
    });
  }

  async findByAssignment(schoolId: string, courseAssignmentId: string, bimester?: number) {
    return prisma.courseContent.findMany({
      where: {
        schoolId,
        courseAssignmentId,
        ...(bimester ? { bimester } : {}),
      },
      include: {
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastNamePaternal: true,
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findById(schoolId: string, id: string) {
    return prisma.courseContent.findFirst({
      where: {
        id,
        schoolId,
      },
      include: {
        courseAssignment: {
          include: {
            classroom: true,
            area: true,
          },
        },
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastNamePaternal: true,
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
    });
  }

  async create(schoolId: string, teacherId: string, data: CreateCourseContentDto) {
    return prisma.courseContent.create({
      data: {
        schoolId,
        teacherId,
        courseAssignmentId: data.courseAssignmentId,
        bimester: data.bimester,
        contentType: data.contentType,
        title: data.title,
        description: data.description,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileType: data.fileType,
        fileSize: data.fileSize,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      },
      include: {
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastNamePaternal: true,
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
    });
  }

  async delete(schoolId: string, id: string) {
    return prisma.courseContent.deleteMany({
      where: {
        id,
        schoolId,
      },
    });
  }

  async findComments(schoolId: string, courseContentId: string) {
    return prisma.forumComment.findMany({
      where: {
        schoolId,
        courseContentId,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastNamePaternal: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async addComment(schoolId: string, courseContentId: string, userId: string, content: string) {
    return prisma.forumComment.create({
      data: {
        schoolId,
        courseContentId,
        userId,
        content,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastNamePaternal: true,
            role: true,
          },
        },
      },
    });
  }

  async findStudentCourses(schoolId: string, studentId: string) {
    const activeEnrollment = await prisma.enrollment.findFirst({
      where: {
        schoolId,
        studentId,
        enrollmentState: 'REGISTERED',
      },
      include: {
        classroom: {
          include: {
            assignments: {
              include: {
                area: true,
                teacher: {
                  select: {
                    id: true,
                    firstName: true,
                    lastNamePaternal: true,
                    email: true,
                  },
                },
                _count: {
                  select: {
                    contents: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        enrollmentDate: 'desc',
      },
    });

    if (!activeEnrollment) return null;

    return {
      enrollmentId: activeEnrollment.id,
      classroom: activeEnrollment.classroom,
      courses: activeEnrollment.classroom.assignments.map((assignment) => ({
        assignmentId: assignment.id,
        areaId: assignment.areaId,
        areaName: assignment.area.name,
        officialCode: assignment.area.officialCode,
        teacher: assignment.teacher,
        totalContents: assignment._count.contents,
      })),
    };
  }

  async findStudentTasks(schoolId: string, studentId: string) {
    const activeEnrollment = await prisma.enrollment.findFirst({
      where: {
        schoolId,
        studentId,
        enrollmentState: 'REGISTERED',
      },
      select: {
        classroomId: true,
      },
    });

    if (!activeEnrollment) return { homeworks: [], forums: [] };

    const [homeworks, forums] = await Promise.all([
      prisma.courseContent.findMany({
        where: {
          schoolId,
          courseAssignment: { classroomId: activeEnrollment.classroomId },
          contentType: 'HOMEWORK',
        },
        include: {
          courseAssignment: {
            include: {
              area: true,
              teacher: { select: { firstName: true, lastNamePaternal: true } },
            },
          },
        },
        orderBy: { dueDate: 'asc' },
        take: 10,
      }),
      prisma.courseContent.findMany({
        where: {
          schoolId,
          courseAssignment: { classroomId: activeEnrollment.classroomId },
          contentType: 'FORUM',
        },
        include: {
          courseAssignment: {
            include: { area: true },
          },
          _count: { select: { comments: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    return { homeworks, forums };
  }

  async getSupervisionStats(schoolId: string, bimester?: number) {
    const whereClause = {
      schoolId,
      ...(bimester ? { bimester } : {}),
    };

    const [
      countsByType,
      totalAssignments,
      assignmentsWithContent,
      activeTeachers,
      totalTeachers,
      totalComments,
      recentContents,
    ] = await Promise.all([
      prisma.courseContent.groupBy({
        by: ['contentType'],
        where: whereClause,
        _count: { _all: true },
        _sum: { fileSize: true },
      }),
      prisma.courseAssignment.count({
        where: { schoolId },
      }),
      prisma.courseContent.groupBy({
        by: ['courseAssignmentId'],
        where: whereClause,
      }),
      prisma.courseContent.groupBy({
        by: ['teacherId'],
        where: whereClause,
      }),
      prisma.user.count({
        where: { schoolId, role: 'TEACHER', isActive: true },
      }),
      prisma.forumComment.count({
        where: { schoolId },
      }),
      prisma.courseContent.findMany({
        where: whereClause,
        take: 6,
        orderBy: { createdAt: 'desc' },
        include: {
          teacher: {
            select: { id: true, firstName: true, lastNamePaternal: true },
          },
          courseAssignment: {
            include: {
              classroom: { select: { grade: true, section: true, educationLevel: true } },
              area: { select: { name: true } },
            },
          },
        },
      }),
    ]);

    let lessonMaterialsCount = 0;
    let homeworksCount = 0;
    let forumsCount = 0;
    let totalSizeBytes = 0;

    countsByType.forEach((item) => {
      const count = item._count._all;
      const size = item._sum.fileSize || 0;
      totalSizeBytes += size;
      if (item.contentType === 'LESSON_MATERIAL') lessonMaterialsCount = count;
      if (item.contentType === 'HOMEWORK') homeworksCount = count;
      if (item.contentType === 'FORUM') forumsCount = count;
    });

    const totalContents = lessonMaterialsCount + homeworksCount + forumsCount;
    const coursesWithContentCount = assignmentsWithContent.length;
    const coveragePercentage = totalAssignments > 0
      ? Math.round((coursesWithContentCount / totalAssignments) * 100)
      : 0;

    return {
      totalContents,
      lessonMaterialsCount,
      homeworksCount,
      forumsCount,
      totalSizeBytes,
      totalAssignments,
      coursesWithContentCount,
      coveragePercentage,
      activeTeachersCount: activeTeachers.length,
      totalTeachers,
      totalComments,
      recentContents,
    };
  }

  async getTeacherCompliance(schoolId: string, bimester?: number) {
    const teachers = await prisma.user.findMany({
      where: { schoolId, role: 'TEACHER', isActive: true },
      select: {
        id: true,
        firstName: true,
        lastNamePaternal: true,
        lastNameMaternal: true,
        email: true,
        coursesTaught: {
          where: { schoolId },
          select: {
            id: true,
            classroom: {
              select: {
                id: true,
                grade: true,
                section: true,
                educationLevel: true,
              },
            },
            area: {
              select: {
                id: true,
                name: true,
              },
            },
            _count: {
              select: {
                contents: {
                  where: {
                    schoolId,
                    ...(bimester ? { bimester } : {}),
                  },
                },
              },
            },
          },
        },
        authoredContents: {
          where: {
            schoolId,
            ...(bimester ? { bimester } : {}),
          },
          select: {
            id: true,
            contentType: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
        _count: {
          select: {
            authoredContents: {
              where: {
                schoolId,
                ...(bimester ? { bimester } : {}),
              },
            },
          },
        },
      },
      orderBy: [
        { lastNamePaternal: 'asc' },
        { firstName: 'asc' },
      ],
    });

    return teachers.map((t) => {
      const assignedCoursesCount = t.coursesTaught.length;
      const coursesWithContentCount = t.coursesTaught.filter((c) => c._count.contents > 0).length;
      const totalContents = t._count.authoredContents;
      const lastPublishedAt = t.authoredContents[0]?.createdAt || null;

      let status: 'COMPLIANT' | 'PARTIAL' | 'INACTIVE' = 'INACTIVE';
      if (assignedCoursesCount > 0) {
        if (coursesWithContentCount === assignedCoursesCount && totalContents > 0) {
          status = 'COMPLIANT';
        } else if (coursesWithContentCount > 0 || totalContents > 0) {
          status = 'PARTIAL';
        } else {
          status = 'INACTIVE';
        }
      }

      return {
        id: t.id,
        fullName: `${t.lastNamePaternal} ${t.lastNameMaternal || ''}, ${t.firstName}`.trim(),
        email: t.email,
        assignedCoursesCount,
        coursesWithContentCount,
        totalContents,
        lastPublishedAt,
        status,
        courses: t.coursesTaught.map((c) => ({
          assignmentId: c.id,
          areaName: c.area.name,
          classroomLabel: `${c.classroom.grade}° "${c.classroom.section}" - ${c.classroom.educationLevel}`,
          contentsCount: c._count.contents,
        })),
      };
    });
  }

  async findSupervisedFeed(schoolId: string, filters: SupervisionFilterDto) {
    const where: Prisma.CourseContentWhereInput = {
      schoolId,
      ...(filters.bimester ? { bimester: filters.bimester } : {}),
      ...(filters.contentType ? { contentType: filters.contentType } : {}),
      ...(filters.teacherId ? { teacherId: filters.teacherId } : {}),
    };

    if (filters.classroomId || filters.educationLevel) {
      where.courseAssignment = {
        ...(filters.classroomId ? { classroomId: filters.classroomId } : {}),
        ...(filters.educationLevel ? { classroom: { educationLevel: filters.educationLevel } } : {}),
      };
    }

    if (filters.search) {
      const term = filters.search;
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { fileName: { contains: term, mode: 'insensitive' } },
      ];
    }

    const skip = (filters.page - 1) * filters.limit;
    const take = filters.limit;

    const [items, total] = await Promise.all([
      prisma.courseContent.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          teacher: {
            select: {
              id: true,
              firstName: true,
              lastNamePaternal: true,
              lastNameMaternal: true,
              email: true,
            },
          },
          courseAssignment: {
            include: {
              classroom: {
                select: {
                  id: true,
                  grade: true,
                  section: true,
                  educationLevel: true,
                },
              },
              area: {
                select: {
                  id: true,
                  name: true,
                  officialCode: true,
                },
              },
            },
          },
          _count: {
            select: {
              comments: true,
            },
          },
        },
      }),
      prisma.courseContent.count({ where }),
    ]);

    return {
      items,
      total,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.ceil(total / filters.limit),
    };
  }
}

