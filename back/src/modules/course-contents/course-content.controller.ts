import { Request, Response } from 'express';
import { CourseContentService } from './course-content.service';
import { createCourseContentSchema, createForumCommentSchema } from './course-content.schema';

export class CourseContentController {
  constructor(private readonly service: CourseContentService) {}

  getByAssignment = async (req: Request, res: Response): Promise<void> => {
    const schoolId = req.user!.schoolId;
    const assignmentId = req.params.assignmentId as string;
    const bimester = req.query.bimester ? Number(req.query.bimester) : undefined;

    const data = await this.service.getByAssignment(schoolId, assignmentId, bimester);
    res.status(200).json({ status: 'success', data });
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const schoolId = req.user!.schoolId;
    const id = req.params.id as string;

    const data = await this.service.getById(schoolId, id);
    res.status(200).json({ status: 'success', data });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const schoolId = req.user!.schoolId;
    const user = { id: req.user!.userId, role: req.user!.role };
    const validatedData = createCourseContentSchema.parse(req.body);

    const data = await this.service.create(schoolId, user, validatedData);
    res.status(201).json({ status: 'success', data });
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const schoolId = req.user!.schoolId;
    const user = { id: req.user!.userId, role: req.user!.role };
    const id = req.params.id as string;

    const result = await this.service.delete(schoolId, user, id);
    res.status(200).json({ status: 'success', data: result });
  };

  getComments = async (req: Request, res: Response): Promise<void> => {
    const schoolId = req.user!.schoolId;
    const id = req.params.id as string;

    const data = await this.service.getComments(schoolId, id);
    res.status(200).json({ status: 'success', data });
  };

  addComment = async (req: Request, res: Response): Promise<void> => {
    const schoolId = req.user!.schoolId;
    const userId = req.user!.userId;
    const id = req.params.id as string;
    const validatedBody = createForumCommentSchema.parse(req.body);

    const data = await this.service.addComment(schoolId, userId, id, validatedBody.content);
    res.status(201).json({ status: 'success', data });
  };

  getStudentCourses = async (req: Request, res: Response): Promise<void> => {
    const schoolId = req.user!.schoolId;
    const studentId = req.params.studentId as string;

    const data = await this.service.getStudentCourses(schoolId, studentId);
    res.status(200).json({ status: 'success', data });
  };

  getStudentTasks = async (req: Request, res: Response): Promise<void> => {
    const schoolId = req.user!.schoolId;
    const studentId = req.params.studentId as string;

    const data = await this.service.getStudentTasks(schoolId, studentId);
    res.status(200).json({ status: 'success', data });
  };
}
