import type { Request, Response } from 'express';
import { AppError } from '../../core/errors/app-error';
import { selectedAcademicYearId } from '../../utils/academic-year-scope';
import { recordAudit } from '../../utils/audit.util';
import { commitImportSchema } from './student-import.schema';
import type { StudentImportService } from './student-import.service';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export class StudentImportController {
  constructor(private readonly service: StudentImportService) {}

  private fileOf(request: Request): Buffer {
    const file = request.file as Express.Multer.File | undefined;
    if (!file) throw new AppError('Sube el archivo Excel con los alumnos.', 400);
    return file.buffer;
  }

  private sendWorkbook(response: Response, fileName: string, buffer: Buffer): void {
    response.setHeader('Content-Type', XLSX_MIME);
    response.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    response.send(buffer);
  }

  template = async (request: Request, response: Response): Promise<void> => {
    const { buffer, fileName } = await this.service.buildTemplate(request.user!.schoolId, await selectedAcademicYearId(request));
    this.sendWorkbook(response, fileName, buffer);
  };

  preview = async (request: Request, response: Response): Promise<void> => {
    const plan = await this.service.preview(request.user!.schoolId, await selectedAcademicYearId(request), this.fileOf(request));
    response.status(200).json({ status: 'success', data: plan });
  };

  rejected = async (request: Request, response: Response): Promise<void> => {
    const { buffer, fileName } = await this.service.buildRejectedWorkbook(
      request.user!.schoolId,
      await selectedAcademicYearId(request),
      this.fileOf(request),
    );
    this.sendWorkbook(response, fileName, buffer);
  };

  commit = async (request: Request, response: Response): Promise<void> => {
    const options = commitImportSchema.parse(request.body ?? {});
    const result = await this.service.commit(request.user!.schoolId, await selectedAcademicYearId(request), this.fileOf(request), options);
    recordAudit(request, {
      action: 'STUDENTS_BULK_IMPORTED',
      entity: 'Student',
      after: { fileName: (request.file as Express.Multer.File | undefined)?.originalname, options, ...result },
    });
    response.status(200).json({ status: 'success', data: result });
  };
}
