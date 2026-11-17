import { z } from 'zod';
import { recordAudit } from '../../utils/audit.util';
import { selectedAcademicYearId } from '../../utils/academic-year-scope';
import { teacherReplacementService } from './teacher-replacement.service';
import { Router } from 'express';
import { authMiddleware, authorizeRoles } from '../../core/middlewares/auth.middleware';
import { tenantMiddleware } from '../../core/middlewares/tenant.middleware';
import { requirePlan } from '../../core/middlewares/plan.middleware';
import { academicController as c } from './academic.controller';
import { useSelectedAcademicYear } from './academic-year.middleware';

const router = Router();
router.use(authMiddleware, tenantMiddleware);

// Año elegido en la cabecera (Dirección) cuando la petición no indica uno
router.use(useSelectedAcademicYear);

const ADMIN = authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN');
const STAFF = authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER');
const GRADERS = authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER');
const OFFICE = authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE');
const ALL = authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER', 'PARENT', 'STUDENT');
const PRO = requirePlan('PRO', 'ENTERPRISE');

// Configuración académica
router.get('/catalog', STAFF, c.catalog);
router.get('/setup-status', ADMIN, c.setupStatus);
router.get('/study-plan', STAFF, c.studyPlan);
router.post('/study-plan/apply-template', ADMIN, c.applyTemplate);
router.post('/study-plan/subcourses', ADMIN, c.createSubcourses);
router.get('/study-plan/preuniversity', STAFF, c.preuniversityCatalog);
router.put('/study-plan/preuniversity', ADMIN, c.configurePreuniversity);
router.post('/study-plan/workshops', ADMIN, c.addWorkshop);
router.post('/study-plan/copy', ADMIN, c.copyPlan);
router.patch('/study-plan/courses/:planCourseId', ADMIN, c.updatePlanCourse);
router.delete('/study-plan/courses/:planCourseId', ADMIN, c.removePlanCourse);
router.put('/courses/:areaId/competences', ADMIN, c.updateCourseCompetences);
router.patch('/courses/:areaId', ADMIN, c.renameCourse);

// Carga docente
router.get('/teaching-load', ADMIN, c.teachingLoad);

// Reemplazo de docente a mitad de año (cursos, tutoría y contenidos en un paso, con historial)
router.get('/teacher-replacements', ADMIN, async (req, res) => {
  res.json({ status: 'success', data: await teacherReplacementService.list(req.user!.schoolId, await selectedAcademicYearId(req)) });
});
router.get('/teacher-replacements/preview/:teacherId', ADMIN, async (req, res) => {
  const teacherId = z.string().uuid().parse(req.params.teacherId);
  res.json({ status: 'success', data: await teacherReplacementService.preview(req.user!.schoolId, teacherId, await selectedAcademicYearId(req)) });
});
router.post('/teacher-replacements', ADMIN, async (req, res) => {
  const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (AAAA-MM-DD)');
  const dto = z
    .object({
      outgoingTeacherId: z.string().uuid(),
      incomingTeacherId: z.string().uuid(),
      kind: z.enum(['PERMANENT', 'TEMPORARY']),
      effectiveDate: date,
      untilDate: date.nullable().optional(),
      reason: z.string().trim().min(5, 'Escribe el motivo (mínimo 5 caracteres).').max(300),
      outgoingAction: z.enum(['KEEP', 'REMOVE_FROM_YEAR', 'DEACTIVATE']).default('KEEP'),
      copyRubrics: z.boolean().default(true),
    })
    .parse(req.body);
  const result = await teacherReplacementService.execute(req.user!.schoolId, req.user!.userId, { ...dto, academicYearId: await selectedAcademicYearId(req) });
  recordAudit(req, {
    action: 'TEACHER_REPLACED',
    entity: 'TeacherReplacement',
    entityId: result.replacement.id,
    after: { saliente: dto.outgoingTeacherId, entrante: dto.incomingTeacherId, tipo: dto.kind, desde: dto.effectiveDate, hasta: dto.untilDate ?? null, motivo: dto.reason, saliente_accion: dto.outgoingAction, ...result.transferred },
  });
  res.status(201).json({ status: 'success', data: result });
});
router.post('/teacher-replacements/:id/end', ADMIN, async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const { returnDate } = z.object({ returnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }).parse(req.body ?? {});
  const result = await teacherReplacementService.endTemporary(req.user!.schoolId, req.user!.userId, id, returnDate);
  recordAudit(req, { action: 'TEACHER_REPLACEMENT_ENDED', entity: 'TeacherReplacement', entityId: id, after: result });
  res.json({ status: 'success', data: result });
});
router.put('/teaching-load', ADMIN, c.saveTeachingLoad);
router.post('/teaching-load/whole-classroom', ADMIN, c.wholeClassroom);
router.post('/teaching-load/copy', ADMIN, c.copyTeachingLoad);
router.get('/my-courses', authorizeRoles('TEACHER'), c.myCourses);

// Periodos
router.get('/periods', STAFF, c.periods);
router.put('/periods/status', ADMIN, c.setPeriodStatus);

// Evaluación (plan PRO)
router.get('/gradebook/export', STAFF, PRO, c.exportGradebook);
router.get('/gradebook/:assignmentId', STAFF, PRO, c.gradebook);
router.put('/gradebook/:assignmentId/scores', GRADERS, PRO, c.saveScores);
router.put('/gradebook/:assignmentId/final-letter', GRADERS, PRO, c.setFinalLetter);
router.put('/gradebook/:assignmentId/conclusions', GRADERS, PRO, c.saveConclusions);
router.put('/gradebook/:assignmentId/criteria', GRADERS, PRO, c.setCourseCriteria);
router.get('/phrases', STAFF, PRO, c.phrasesForAssignment);
router.get('/phrases/manage', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER'), PRO, c.phrasesManage);
router.post('/phrases', GRADERS, PRO, c.createPhrase);
router.patch('/phrases/:phraseId', GRADERS, PRO, c.updatePhrase);
router.delete('/phrases/:phraseId', GRADERS, PRO, c.deletePhrase);
router.put('/phrases/hidden', ADMIN, PRO, c.setPhraseHidden);
router.get('/progress', ADMIN, PRO, c.progress);
router.get('/my-progress', authorizeRoles('TEACHER'), PRO, c.myProgress);
router.post('/progress/remind', ADMIN, PRO, c.remind);
router.get('/consolidation/export', OFFICE, PRO, c.exportConsolidation);
router.get('/consolidation', OFFICE, PRO, c.consolidation);
router.get('/report-card/:enrollmentId', ALL, PRO, c.reportCard);
router.get('/report-cards', STAFF, PRO, c.classroomReportCards);
router.get('/tutor-report', STAFF, PRO, c.tutorReport);
router.put('/tutor-report', GRADERS, PRO, c.saveTutorReport);

export { router as academicRouter };
