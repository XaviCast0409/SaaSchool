import { Router } from 'express';
import { authMiddleware, authorizeRoles } from '../../core/middlewares/auth.middleware';
import { tenantMiddleware } from '../../core/middlewares/tenant.middleware';
import { requirePlan } from '../../core/middlewares/plan.middleware';
import { academicController as c } from './academic.controller';

const router = Router();
router.use(authMiddleware, tenantMiddleware);

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
router.post('/study-plan/workshops', ADMIN, c.addWorkshop);
router.post('/study-plan/copy', ADMIN, c.copyPlan);
router.patch('/study-plan/courses/:planCourseId', ADMIN, c.updatePlanCourse);
router.delete('/study-plan/courses/:planCourseId', ADMIN, c.removePlanCourse);
router.put('/courses/:areaId/competences', ADMIN, c.updateCourseCompetences);
router.patch('/courses/:areaId', ADMIN, c.renameCourse);

// Carga docente
router.get('/teaching-load', ADMIN, c.teachingLoad);
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
router.get('/progress', ADMIN, PRO, c.progress);
router.get('/my-progress', authorizeRoles('TEACHER'), PRO, c.myProgress);
router.post('/progress/remind', ADMIN, PRO, c.remind);
router.get('/consolidation/export', OFFICE, PRO, c.exportConsolidation);
router.get('/consolidation', OFFICE, PRO, c.consolidation);
router.get('/report-card/:enrollmentId', ALL, PRO, c.reportCard);
router.get('/report-cards', STAFF, PRO, c.classroomReportCards);

export { router as academicRouter };
