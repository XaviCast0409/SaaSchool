import type { Request, Response } from 'express';
import { z } from 'zod';
import { recordAudit } from '../../utils/audit.util';
import { NominaService } from './nomina.service';
import { TemplateService } from './template.service';

const nomina = new NominaService();
const templates = new TemplateService();

type UploadedFiles = Array<{ buffer: Buffer; originalname: string }>;
const filesOf = (req: Request): UploadedFiles => ((req.files as Express.Multer.File[] | undefined) ?? []).map((f) => ({
  buffer: f.buffer,
  originalname: Buffer.from(f.originalname, 'latin1').toString('utf8'),
}));
const ok = (res: Response, data: unknown, status = 200) => res.status(status).json({ status: 'success', data });
const boolField = z.preprocess((v) => v === true || v === 'true' || v === '1', z.boolean());

export const siagieController = {
  nominaPreview: async (req: Request, res: Response) => {
    ok(res, await nomina.preview(req.user!.schoolId, filesOf(req)));
  },

  nominaCommit: async (req: Request, res: Response) => {
    const body = z.object({ updateExisting: boolField.default(true) }).parse(req.body ?? {});
    const files = filesOf(req);
    const data = await nomina.commit(req.user!.schoolId, files, body);
    recordAudit(req, { action: 'SIAGIE_NOMINA_IMPORTED', entity: 'Student', after: { files: files.map((f) => f.originalname), ...data } });
    ok(res, data);
  },

  inspectTemplates: async (req: Request, res: Response) => {
    ok(res, await templates.inspect(req.user!.schoolId, filesOf(req)));
  },

  importTemplateGrades: async (req: Request, res: Response) => {
    const files = filesOf(req);
    const data = await templates.importGrades(req.user!.schoolId, req.user!.userId, files);
    recordAudit(req, { action: 'SIAGIE_TEMPLATE_GRADES_IMPORTED', entity: 'CompetencePeriodResult', after: data });
    ok(res, data);
  },

  fillTemplates: async (req: Request, res: Response) => {
    const body = z.object({ fillFromBank: boolField.default(true), overwrite: boolField.default(true) }).parse(req.body ?? {});
    const files = filesOf(req);
    const data = await templates.fill(req.user!.schoolId, files, body);
    recordAudit(req, {
      action: 'SIAGIE_TEMPLATE_FILLED',
      entity: 'SiagieTemplate',
      after: { files: files.map((f) => f.originalname), options: body, reports: data.reports.map((r) => ({ file: r.fileName, grades: r.writtenGrades, conclusions: r.writtenConclusions })) },
    });
    ok(res, data);
  },
};
