import { Request, Response } from 'express';
import {
  createStudentSchema,
  updateStudentSchema,
  studentFilterSchema,
  registerFichaMatriculaSchema,
} from './student.schema';
import type { StudentService } from './student.service';

export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  getCatalogs = async (_request: Request, response: Response): Promise<void> => {
    const catalogs = this.studentService.getCatalogs();
    response.status(200).json({ status: 'success', data: catalogs });
  };

  getAll = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const queryFilters = studentFilterSchema.parse(request.query);
    const result = await this.studentService.getAllStudents(schoolId, queryFilters);

    response.status(200).json({
      status: 'success',
      data: result.data,
      meta: result.meta,
    });
  };

  getById = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const id = request.params.id as string;
    const student = await this.studentService.getStudentById(id, schoolId);
    response.status(200).json({ status: 'success', data: student });
  };

  create = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const createStudentDto = createStudentSchema.parse(request.body);
    const student = await this.studentService.createStudent(schoolId, createStudentDto);
    response.status(201).json({ status: 'success', data: student });
  };

  registerFicha = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const dto = registerFichaMatriculaSchema.parse(request.body);
    const student = await this.studentService.registerFichaMatricula(schoolId, dto);
    response.status(201).json({ status: 'success', data: student });
  };

  update = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const id = request.params.id as string;
    const updateStudentDto = updateStudentSchema.parse(request.body);
    const student = await this.studentService.updateStudent(id, schoolId, updateStudentDto);
    response.status(200).json({ status: 'success', data: student });
  };

  delete = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const id = request.params.id as string;
    await this.studentService.deleteStudent(id, schoolId);
    response.status(204).send();
  };
}
