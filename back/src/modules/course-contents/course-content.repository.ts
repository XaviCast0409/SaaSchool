import { prisma } from '../../config/prisma';
import type { CreateCourseContentDto } from './course-content.schema';

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
}
