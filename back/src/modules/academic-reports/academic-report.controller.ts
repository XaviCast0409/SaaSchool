import { Request, Response } from 'express';
import { AcademicReportService } from './academic-report.service';
import {
  getClassroomsQuerySchema,
  getConsolidatedGradesQuerySchema,
  getDraftRegisterQuerySchema,
  getMeritClassroomQuerySchema,
  getMeritGradeQuerySchema,
  getConductCommentsQuerySchema,
  getClassroomRosterQuerySchema,
  getFamiliesByStateQuerySchema,
  getFamiliesWithChildrenQuerySchema,
  getFamiliesRelativesQuerySchema,
  getStudentBirthdaysQuerySchema,
} from './academic-report.schema';

export class AcademicReportController {
  constructor(private readonly academicReportService: AcademicReportService) {}

  /**
   * Catálogo de Aulas activas para filtros de reportes.
   */
  getClassrooms = async (req: Request, res: Response): Promise<void> => {
    const schoolId = req.user!.schoolId;
    const query = getClassroomsQuerySchema.parse(req.query);

    const classrooms = await this.academicReportService.getAvailableClassrooms(
      schoolId,
      query.academicYearId,
    );

    res.status(200).json({
      status: 'success',
      data: classrooms,
    });
  };

  /**
   * Reporte 0021: Consolidado de Estudios.
   */
  getConsolidatedGrades = async (req: Request, res: Response): Promise<void> => {
    const schoolId = req.user!.schoolId;
    const query = getConsolidatedGradesQuerySchema.parse(req.query);

    const report = await this.academicReportService.getConsolidatedGrades(
      schoolId,
      query.classroomId,
      query.periodNumber,
    );

    res.status(200).json({
      status: 'success',
      data: report,
    });
  };

  /**
   * Reporte 0048: Orden de Mérito y Tercios por Salón.
   */
  getMeritClassroom = async (req: Request, res: Response): Promise<void> => {
    const schoolId = req.user!.schoolId;
    const query = getMeritClassroomQuerySchema.parse(req.query);

    const report = await this.academicReportService.getMeritClassroom(
      schoolId,
      query.classroomId,
      query.periodNumber,
    );

    res.status(200).json({
      status: 'success',
      data: report,
    });
  };

  /**
   * Reporte 0049: Orden de Mérito y Tercios/Quintos por Grado.
   */
  getMeritGrade = async (req: Request, res: Response): Promise<void> => {
    const schoolId = req.user!.schoolId;
    const query = getMeritGradeQuerySchema.parse(req.query);

    const report = await this.academicReportService.getMeritGrade(
      schoolId,
      query.educationLevel,
      query.grade,
      query.periodNumber,
      query.academicYearId,
    );

    res.status(200).json({
      status: 'success',
      data: report,
    });
  };

  /**
   * Reporte 0041: Registro Auxiliar Borrador (Plantilla en blanco).
   */
  getDraftRegister = async (req: Request, res: Response): Promise<void> => {
    const schoolId = req.user!.schoolId;
    const query = getDraftRegisterQuerySchema.parse(req.query);

    const report = await this.academicReportService.getDraftRegister(
      schoolId,
      query.classroomId,
      query.courseAssignmentId,
    );

    res.status(200).json({
      status: 'success',
      data: report,
    });
  };

  /**
   * Reporte 0030: Listado de Comentarios a la Conducta.
   */
  getConductComments = async (req: Request, res: Response): Promise<void> => {
    const schoolId = req.user!.schoolId;
    const query = getConductCommentsQuerySchema.parse(req.query);

    const report = await this.academicReportService.getConductComments(
      schoolId,
      query.classroomId,
      query.periodNumber,
    );

    res.status(200).json({
      status: 'success',
      data: report,
    });
  };

  /**
   * Reporte 0011: Reporte de Alumnos por Salón (Padrón Oficial).
   */
  getClassroomRoster = async (req: Request, res: Response): Promise<void> => {
    const schoolId = req.user!.schoolId;
    const query = getClassroomRosterQuerySchema.parse(req.query);

    const report = await this.academicReportService.getClassroomRoster(
      schoolId,
      query.classroomId,
    );

    res.status(200).json({
      status: 'success',
      data: report,
    });
  };

  /**
   * Reporte 0001: Listado de Familias por Estado.
   */
  getFamiliesByState = async (req: Request, res: Response): Promise<void> => {
    const schoolId = req.user!.schoolId;
    const query = getFamiliesByStateQuerySchema.parse(req.query);

    const report = await this.academicReportService.getFamiliesByState(
      schoolId,
      query.state,
      query.academicYearId,
    );

    res.status(200).json({
      status: 'success',
      data: report,
    });
  };

  /**
   * Reporte 0002: Listado de Familias e Hijos.
   */
  getFamiliesWithChildren = async (req: Request, res: Response): Promise<void> => {
    const schoolId = req.user!.schoolId;
    const query = getFamiliesWithChildrenQuerySchema.parse(req.query);

    const report = await this.academicReportService.getFamiliesWithChildren(
      schoolId,
      query.classroomId,
      query.academicYearId,
    );

    res.status(200).json({
      status: 'success',
      data: report,
    });
  };

  /**
   * Reporte 0003: Listado de Familias y Parientes (Directorio Institucional).
   */
  getFamiliesRelatives = async (req: Request, res: Response): Promise<void> => {
    const schoolId = req.user!.schoolId;
    const query = getFamiliesRelativesQuerySchema.parse(req.query);

    const report = await this.academicReportService.getFamiliesRelatives(
      schoolId,
      query.classroomId,
      query.academicYearId,
    );

    res.status(200).json({
      status: 'success',
      data: report,
    });
  };

  /**
   * Reporte 0019: Listado de Cumpleaños del Alumno.
   */
  getStudentBirthdays = async (req: Request, res: Response): Promise<void> => {
    const schoolId = req.user!.schoolId;
    const query = getStudentBirthdaysQuerySchema.parse(req.query);

    const report = await this.academicReportService.getStudentBirthdays(
      schoolId,
      query.month,
      query.classroomId,
      query.educationLevel,
      query.academicYearId,
    );

    res.status(200).json({
      status: 'success',
      data: report,
    });
  };
}
