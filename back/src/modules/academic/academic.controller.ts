import type { Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { recordAudit } from '../../utils/audit.util';
import { AppError } from '../../core/errors/app-error';
import * as S from './academic.schema';
import type { AcademicUser } from './academic.context';
import { CurriculumService } from './curriculum.service';
import { TeachingLoadService } from './teaching-load.service';
import { PeriodService } from './period.service';
import { GradebookService } from './gradebook.service';
import { ConsolidationService } from './consolidation.service';
import { ReportCardService } from './report-card.service';
import { ProgressService } from './progress.service';
import { PhraseService } from './phrase.service';
import { TutorReportService } from './tutor-report.service';
import { buildConsolidationWorkbook, buildGradebookWorkbook } from './academic-excel.service';

const curriculum = new CurriculumService();
const load = new TeachingLoadService();
const periods = new PeriodService();
const gradebook = new GradebookService();
const consolidation = new ConsolidationService();
const reportCards = new ReportCardService();
const progress = new ProgressService();
const phrases = new PhraseService();
const tutorReports = new TutorReportService();

const ctx = (req: Request) => {
  const u = req.user!;
  return { schoolId: u.schoolId, user: { userId: u.userId, role: u.role, schoolId: u.schoolId, studentId: u.studentId } as AcademicUser };
};
const ok = (res: Response, data: unknown, status = 200) => res.status(status).json({ status: 'success', data });

export const academicController = {
  catalog: (_req: Request, res: Response) => ok(res, curriculum.getCatalog()),

  studyPlan: async (req: Request, res: Response) => {
    const q = S.studyPlanQuery.parse(req.query);
    ok(res, await curriculum.getStudyPlan(ctx(req).schoolId, q.academicYearId, q.level, q.grade));
  },
  applyTemplate: async (req: Request, res: Response) => {
    const b = S.applyTemplateBody.parse(req.body);
    const data = await curriculum.applyTemplate(ctx(req).schoolId, b.academicYearId, b.level, b.grades, b.includeOptional);
    recordAudit(req, { action: 'ACADEMIC_PLAN_TEMPLATE', entity: 'StudyPlan', after: b });
    ok(res, data);
  },
  createSubcourses: async (req: Request, res: Response) => {
    const b = S.subcoursesBody.parse(req.body);
    const data = await curriculum.createSubcourses(ctx(req).schoolId, b.academicYearId, b.level, b.grades, b.officialAreaCode, b.subcourses);
    recordAudit(req, { action: 'ACADEMIC_SUBCOURSES', entity: 'StudyPlan', after: b });
    ok(res, data, 201);
  },
  // Banco de frases de conclusiones
  phrasesForAssignment: async (req: Request, res: Response) => {
    const q = S.phrasesQuery.parse(req.query);
    const { schoolId, user } = ctx(req);
    ok(res, await phrases.listForAssignment(schoolId, user, q.assignmentId));
  },
  phrasesManage: async (req: Request, res: Response) => {
    const q = S.phrasesManageQuery.parse(req.query);
    const { schoolId, user } = ctx(req);
    ok(res, await phrases.listForManage(schoolId, user, q.level, q.cnebNumber, q.courseKey ?? null));
  },
  createPhrase: async (req: Request, res: Response) => {
    const b = S.phraseCreateBody.parse(req.body);
    const { schoolId, user } = ctx(req);
    ok(res, await phrases.create(schoolId, user, b), 201);
  },
  updatePhrase: async (req: Request, res: Response) => {
    const b = S.phraseUpdateBody.parse(req.body);
    const { schoolId, user } = ctx(req);
    ok(res, await phrases.update(schoolId, user, String(req.params.phraseId), b));
  },
  deletePhrase: async (req: Request, res: Response) => {
    const { schoolId, user } = ctx(req);
    ok(res, await phrases.remove(schoolId, user, String(req.params.phraseId)));
  },
  setPhraseHidden: async (req: Request, res: Response) => {
    const b = S.phraseHiddenBody.parse(req.body);
    ok(res, await phrases.setHidden(ctx(req).schoolId, b.phraseKey, b.hidden));
  },

  preuniversityCatalog: async (req: Request, res: Response) => {
    const q = S.studyPlanQuery.parse(req.query);
    ok(res, await curriculum.getPreuniversityCatalog(ctx(req).schoolId, q.academicYearId, q.level, q.grade));
  },
  configurePreuniversity: async (req: Request, res: Response) => {
    const b = S.preuniversityBody.parse(req.body);
    const data = await curriculum.configurePreuniversity(ctx(req).schoolId, b.academicYearId, b.level, b.grades, b.officialAreaCode, b.courses);
    recordAudit(req, { action: 'ACADEMIC_PREUNIVERSITY_COURSES', entity: 'StudyPlan', after: b });
    ok(res, data);
  },
  addWorkshop: async (req: Request, res: Response) => {
    const b = S.workshopBody.parse(req.body);
    const data = await curriculum.addWorkshop(ctx(req).schoolId, b.academicYearId, b.level, b.grades, b.name, b.weeklyHours);
    recordAudit(req, { action: 'ACADEMIC_WORKSHOP', entity: 'StudyPlan', after: b });
    ok(res, data, 201);
  },
  updatePlanCourse: async (req: Request, res: Response) => {
    const b = S.planCourseUpdateBody.parse(req.body);
    ok(res, await curriculum.updatePlanCourse(ctx(req).schoolId, String(req.params.planCourseId), b));
  },
  removePlanCourse: async (req: Request, res: Response) => {
    const data = await curriculum.removePlanCourse(ctx(req).schoolId, String(req.params.planCourseId));
    recordAudit(req, { action: 'ACADEMIC_PLAN_REMOVE', entity: 'StudyPlanCourse', entityId: String(req.params.planCourseId) });
    ok(res, data);
  },
  copyPlan: async (req: Request, res: Response) => {
    const b = S.copyYearBody.parse(req.body);
    const data = await curriculum.copyPlan(ctx(req).schoolId, b.fromAcademicYearId, b.toAcademicYearId);
    recordAudit(req, { action: 'ACADEMIC_PLAN_COPY', entity: 'StudyPlan', after: b });
    ok(res, data);
  },
  updateCourseCompetences: async (req: Request, res: Response) => {
    const b = S.courseCompetencesBody.parse(req.body);
    const data = await curriculum.updateCourseCompetences(ctx(req).schoolId, String(req.params.areaId), b.competences);
    recordAudit(req, { action: 'ACADEMIC_COURSE_COMPETENCES', entity: 'CurricularArea', entityId: String(req.params.areaId), after: b });
    ok(res, data);
  },
  renameCourse: async (req: Request, res: Response) => {
    const b = S.renameCourseBody.parse(req.body);
    ok(res, await curriculum.renameCourse(ctx(req).schoolId, String(req.params.areaId), b.name));
  },
  setupStatus: async (req: Request, res: Response) => {
    const q = S.yearQuery.parse(req.query);
    ok(res, await curriculum.getSetupStatus(ctx(req).schoolId, q.academicYearId));
  },

  teachingLoad: async (req: Request, res: Response) => {
    const q = S.teachingLoadQuery.parse(req.query);
    ok(res, await load.getMatrix(ctx(req).schoolId, q.academicYearId, q.level));
  },
  saveTeachingLoad: async (req: Request, res: Response) => {
    const b = S.teachingLoadBody.parse(req.body);
    const data = await load.saveChanges(ctx(req).schoolId, b.academicYearId, b.changes);
    recordAudit(req, { action: 'TEACHING_LOAD_SAVE', entity: 'CourseAssignment', after: b });
    ok(res, data);
  },
  wholeClassroom: async (req: Request, res: Response) => {
    const b = S.wholeClassroomBody.parse(req.body);
    const data = await load.assignWholeClassroom(ctx(req).schoolId, b.academicYearId, b.classroomId, b.teacherId);
    recordAudit(req, { action: 'TEACHING_LOAD_SAVE', entity: 'CourseAssignment', after: b });
    ok(res, data);
  },
  copyTeachingLoad: async (req: Request, res: Response) => {
    const b = S.copyYearBody.parse(req.body);
    const data = await load.copyFromYear(ctx(req).schoolId, b.fromAcademicYearId, b.toAcademicYearId);
    recordAudit(req, { action: 'TEACHING_LOAD_COPY', entity: 'CourseAssignment', after: b });
    ok(res, data);
  },
  myCourses: async (req: Request, res: Response) => {
    const { schoolId, user } = ctx(req);
    const courses = await load.getMyCourses(schoolId, user.userId);
    const year = courses[0]?.academicYearId;
    ok(res, { courses, academicYearId: year ?? null });
  },

  periods: async (req: Request, res: Response) => {
    const q = S.yearQuery.parse(req.query);
    ok(res, await periods.list(ctx(req).schoolId, q.academicYearId));
  },
  setPeriodStatus: async (req: Request, res: Response) => {
    const b = S.periodStatusBody.parse(req.body);
    const { schoolId, user } = ctx(req);
    let pending: { missingGrades: number; missingConclusions: number } | undefined;
    if (b.status === 'CLOSED') {
      const p = await progress.getProgress(schoolId, b.academicYearId, b.periodNumber, { classroomId: b.classroomId ?? undefined });
      pending = { missingGrades: p.totals.missingGrades, missingConclusions: p.totals.missingConclusions };
    }
    const data = await periods.setStatus(schoolId, user.userId, b, pending);
    recordAudit(req, { action: 'PERIOD_STATUS', entity: 'AcademicPeriodStatus', entityId: data.id, after: b });
    ok(res, data);
  },

  gradebook: async (req: Request, res: Response) => {
    const q = S.gradebookQuery.parse(req.query);
    const { schoolId, user } = ctx(req);
    ok(res, await gradebook.getGradebook(schoolId, user, String(req.params.assignmentId), q.periodNumber));
  },
  saveScores: async (req: Request, res: Response) => {
    const b = S.scoresBody.parse(req.body);
    const { schoolId, user } = ctx(req);
    const data = await gradebook.saveScores(schoolId, user, String(req.params.assignmentId), b.periodNumber, b.items);
    recordAudit(req, { action: data.correction ? 'GRADES_SAVE_CORRECTION' : 'GRADES_SAVE', entity: 'CourseAssignment', entityId: String(req.params.assignmentId), after: { periodNumber: b.periodNumber, count: b.items.length, items: data.correction ? b.items : undefined, reason: b.reason ?? null } });
    ok(res, data);
  },
  setFinalLetter: async (req: Request, res: Response) => {
    const b = S.finalLetterBody.parse(req.body);
    const { schoolId, user } = ctx(req);
    const data = await gradebook.setFinalLetter(schoolId, user, String(req.params.assignmentId), b.periodNumber, b);
    recordAudit(req, { action: data.correction ? 'GRADES_FINAL_LETTER_CORRECTION' : 'GRADES_FINAL_LETTER', entity: 'CourseAssignment', entityId: String(req.params.assignmentId), after: b });
    ok(res, data);
  },
  saveConclusions: async (req: Request, res: Response) => {
    const b = S.conclusionsBody.parse(req.body);
    const { schoolId, user } = ctx(req);
    const data = await gradebook.saveConclusions(schoolId, user, String(req.params.assignmentId), b.periodNumber, b.items);
    recordAudit(req, { action: data.correction ? 'GRADES_CONCLUSIONS_CORRECTION' : 'GRADES_CONCLUSIONS', entity: 'CourseAssignment', entityId: String(req.params.assignmentId), after: { periodNumber: b.periodNumber, count: b.items.length, reason: b.reason ?? null } });
    ok(res, data);
  },
  setCourseCriteria: async (req: Request, res: Response) => {
    const b = S.courseCriteriaBody.parse(req.body);
    const { schoolId, user } = ctx(req);
    const data = await gradebook.setCourseCriteria(schoolId, user, String(req.params.assignmentId), b.criteria);
    recordAudit(req, { action: 'COURSE_CRITERIA', entity: 'CourseAssignment', entityId: String(req.params.assignmentId), after: b });
    ok(res, data);
  },

  progress: async (req: Request, res: Response) => {
    const q = S.progressQuery.parse(req.query);
    ok(res, await progress.getProgress(ctx(req).schoolId, q.academicYearId, q.periodNumber, { level: q.level }));
  },
  myProgress: async (req: Request, res: Response) => {
    const q = S.progressQuery.parse(req.query);
    const { schoolId, user } = ctx(req);
    ok(res, await progress.getProgress(schoolId, q.academicYearId, q.periodNumber, { teacherId: user.userId }));
  },
  remind: async (req: Request, res: Response) => {
    const b = S.remindBody.parse(req.body);
    ok(res, await progress.remindPending(ctx(req).schoolId, b.academicYearId, b.periodNumber));
  },

  consolidation: async (req: Request, res: Response) => {
    const q = S.consolidationQuery.parse(req.query);
    ok(res, await consolidation.getClassroomConsolidation(ctx(req).schoolId, q.classroomId, q.period, q.academicYearId));
  },
  reportCard: async (req: Request, res: Response) => {
    const { schoolId, user } = ctx(req);
    ok(res, await reportCards.getReportCard(schoolId, user, String(req.params.enrollmentId)));
  },
  tutorReport: async (req: Request, res: Response) => {
    const q = S.tutorReportQuery.parse(req.query);
    const { schoolId, user } = ctx(req);
    ok(res, await tutorReports.getForClassroom(schoolId, user, q.classroomId, q.periodNumber));
  },
  saveTutorReport: async (req: Request, res: Response) => {
    const b = S.tutorReportBody.parse(req.body);
    const { schoolId, user } = ctx(req);
    const data = await tutorReports.save(schoolId, user, b.classroomId, b.periodNumber, b.rows);
    recordAudit(req, { action: 'ACADEMIC_TUTOR_REPORT_SAVED', entity: 'StudentPeriodReport', after: { classroomId: b.classroomId, periodNumber: b.periodNumber, rows: b.rows.length } });
    ok(res, data);
  },
  classroomReportCards: async (req: Request, res: Response) => {
    const q = S.classroomQuery.parse(req.query);
    const { schoolId, user } = ctx(req);
    if (!['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'].includes(user.role)) throw new AppError('No autorizado.', 403);
    ok(res, await reportCards.getClassroomReportCards(schoolId, user, q.classroomId));
  },

  exportConsolidation: async (req: Request, res: Response) => {
    const q = S.consolidationQuery.parse(req.query);
    const data = await consolidation.getClassroomConsolidation(ctx(req).schoolId, q.classroomId, q.period, q.academicYearId);
    const buffer = await buildConsolidationWorkbook(data);
    const name = `consolidado-${data.classroom.grade}${data.classroom.section}-${q.period}.xlsx`.replace(/\s+/g, '');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
    res.send(buffer);
  },
  exportGradebook: async (req: Request, res: Response) => {
    const q = S.gradebookExportQuery.parse(req.query);
    const { schoolId, user } = ctx(req);
    const data = await gradebook.getGradebook(schoolId, user, q.assignmentId, q.periodNumber);
    const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { name: true } });
    const buffer = await buildGradebookWorkbook(data, school?.name ?? 'Colegio');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="registro-auxiliar-p${q.periodNumber}.xlsx"`);
    res.send(buffer);
  },
};

