/**
 * Convierte los registros técnicos de la bitácora (AuditLog) en texto en español entendible
 * para la Dirección: quién hizo qué, sobre qué alumno/curso, y con qué detalle.
 * Los códigos internos (action/entity) se conservan en la base; aquí solo se traducen.
 */
import type { AuditLog, EducationLevel } from '@prisma/client';
import { prisma } from '../../config/prisma';

export type AuditCategory = 'NOTAS' | 'ACADEMICO' | 'ASISTENCIA' | 'MATRICULA' | 'PAGOS' | 'USUARIOS' | 'COLEGIO' | 'CONVIVENCIA';

export const CATEGORY_LABEL: Record<AuditCategory, string> = {
  NOTAS: 'Notas y evaluación',
  ACADEMICO: 'Configuración académica',
  ASISTENCIA: 'Asistencia',
  MATRICULA: 'Estudiantes y matrícula',
  PAGOS: 'Pagos y pensiones',
  USUARIOS: 'Usuarios y accesos',
  COLEGIO: 'Datos del colegio',
  CONVIVENCIA: 'Convivencia e incidencias',
};

/** Verbo en pasado (para la frase) + etiqueta corta + categoría. */
export const ACTION_CATALOG: Record<string, { label: string; verb: string; category: AuditCategory }> = {
  // Notas
  GRADES_SAVE: { label: 'Registro de notas', verb: 'registró notas', category: 'NOTAS' },
  GRADES_SAVE_CORRECTION: { label: 'Corrección de notas', verb: 'corrigió notas', category: 'NOTAS' },
  GRADES_FINAL_LETTER: { label: 'Calificativo final', verb: 'cambió un calificativo final', category: 'NOTAS' },
  GRADES_FINAL_LETTER_CORRECTION: { label: 'Corrección de calificativo final', verb: 'corrigió un calificativo final', category: 'NOTAS' },
  GRADES_CONCLUSIONS: { label: 'Conclusiones descriptivas', verb: 'registró conclusiones descriptivas', category: 'NOTAS' },
  GRADES_CONCLUSIONS_CORRECTION: { label: 'Corrección de conclusiones', verb: 'corrigió conclusiones descriptivas', category: 'NOTAS' },
  GRADES_SYNC_HOMEWORK_TO_MATRIX: { label: 'Importación de tareas', verb: 'importó las notas de tareas del aula virtual', category: 'NOTAS' },
  COURSE_CRITERIA: { label: 'Criterios del curso', verb: 'cambió los criterios de evaluación del curso', category: 'NOTAS' },
  GRADES_CREATE_CRITERION: { label: 'Nuevo criterio de evaluación', verb: 'creó un criterio de evaluación', category: 'NOTAS' },
  GRADES_UPDATE_CRITERION: { label: 'Edición de criterio', verb: 'editó un criterio de evaluación', category: 'NOTAS' },
  GRADES_DELETE_CRITERION: { label: 'Eliminación de criterio', verb: 'eliminó un criterio de evaluación', category: 'NOTAS' },
  GRADING_SCALE_UPDATED: { label: 'Escala de calificación', verb: 'cambió la escala de calificación', category: 'NOTAS' },
  PERIOD_STATUS: { label: 'Estado del periodo', verb: 'cambió el estado de un periodo', category: 'NOTAS' },
  // Configuración académica
  ACADEMIC_YEAR_CREATE: { label: 'Nuevo año lectivo', verb: 'creó un año lectivo', category: 'ACADEMICO' },
  ACADEMIC_YEAR_UPDATE: { label: 'Edición de año lectivo', verb: 'editó un año lectivo', category: 'ACADEMICO' },
  ACADEMIC_YEAR_ACTIVATE: { label: 'Cambio de año activo', verb: 'activó un año lectivo', category: 'ACADEMICO' },
  ACADEMIC_YEAR_DELETE: { label: 'Eliminación de año lectivo', verb: 'eliminó un año lectivo', category: 'ACADEMICO' },
  ACADEMIC_PLAN_TEMPLATE: { label: 'Plantilla CNEB', verb: 'aplicó la plantilla CNEB al plan de estudios', category: 'ACADEMICO' },
  ACADEMIC_TUTOR_REPORT_SAVED: { label: 'Libreta: conducta y comentario', verb: 'registró conducta y comentarios del tutor en la libreta', category: 'ACADEMICO' },
  ACADEMIC_SUBCOURSES: { label: 'División de un área', verb: 'dividió un área en cursos', category: 'ACADEMICO' },
  ACADEMIC_WORKSHOP: { label: 'Nuevo taller', verb: 'agregó un taller al plan de estudios', category: 'ACADEMICO' },
  ACADEMIC_PLAN_REMOVE: { label: 'Curso quitado del plan', verb: 'quitó un curso del plan de estudios', category: 'ACADEMICO' },
  ACADEMIC_PLAN_COPY: { label: 'Copia del plan de estudios', verb: 'copió el plan de estudios de otro año', category: 'ACADEMICO' },
  ACADEMIC_COURSE_COMPETENCES: { label: 'Competencias de un curso', verb: 'cambió las competencias de un curso', category: 'ACADEMICO' },
  TEACHING_LOAD_SAVE: { label: 'Carga docente', verb: 'actualizó la carga docente', category: 'ACADEMICO' },
  TEACHING_LOAD_COPY: { label: 'Copia de carga docente', verb: 'copió la carga docente de otro año', category: 'ACADEMICO' },
  // Asistencia
  ATTENDANCE_CLOSED_MANUALLY: { label: 'Cierre de asistencia', verb: 'cerró la asistencia del día', category: 'ASISTENCIA' },
  ATTENDANCE_CHECKOUT: { label: 'Registro de salida', verb: 'registró la salida de un estudiante', category: 'ASISTENCIA' },
  ATTENDANCE_JUSTIFICATION_CREATED: { label: 'Justificación enviada', verb: 'envió una justificación de inasistencia', category: 'ASISTENCIA' },
  ATTENDANCE_JUSTIFICATION_APPROVED: { label: 'Justificación aprobada', verb: 'aprobó una justificación', category: 'ASISTENCIA' },
  ATTENDANCE_JUSTIFICATION_REJECTED: { label: 'Justificación rechazada', verb: 'rechazó una justificación', category: 'ASISTENCIA' },
  ATTENDANCE_ALERT_ATTENDED: { label: 'Alerta atendida', verb: 'marcó como atendida una alerta de asistencia', category: 'ASISTENCIA' },
  ATTENDANCE_ALERT_FAMILY_CITED: { label: 'Citación por asistencia', verb: 'citó a la familia por una alerta de asistencia', category: 'ASISTENCIA' },
  COURSE_ATTENDANCE_SAVED: { label: 'Asistencia por curso', verb: 'registró asistencia de una clase', category: 'ASISTENCIA' },
  PICKUP_CREATED: { label: 'Persona autorizada', verb: 'agregó una persona autorizada para el recojo', category: 'ASISTENCIA' },
  PICKUP_UPDATED: { label: 'Edición de persona autorizada', verb: 'editó una persona autorizada para el recojo', category: 'ASISTENCIA' },
  PICKUP_DEACTIVATED: { label: 'Persona autorizada retirada', verb: 'retiró una persona autorizada para el recojo', category: 'ASISTENCIA' },
  // Estudiantes y matrícula
  STUDENT_CREATED: { label: 'Nuevo estudiante', verb: 'registró un estudiante', category: 'MATRICULA' },
  STUDENT_ENROLLED_FICHA: { label: 'Ficha de matrícula', verb: 'registró la ficha de matrícula de un estudiante', category: 'MATRICULA' },
  STUDENT_UPDATED: { label: 'Edición de estudiante', verb: 'editó los datos de un estudiante', category: 'MATRICULA' },
  STUDENT_DELETED: { label: 'Eliminación de estudiante', verb: 'eliminó un estudiante', category: 'MATRICULA' },
  STUDENT_PASSWORD_RESET: { label: 'Clave de estudiante', verb: 'restableció la contraseña de un estudiante', category: 'MATRICULA' },
  STUDENT_DATA_EXPORTED: { label: 'Exportación de datos', verb: 'exportó los datos personales de un estudiante', category: 'MATRICULA' },
  CREDENTIALS_BULK_GENERATED: { label: 'Credenciales del aula', verb: 'generó credenciales de acceso para un aula', category: 'MATRICULA' },
  ENROLLMENT_CREATED: { label: 'Nueva matrícula', verb: 'matriculó a un estudiante', category: 'MATRICULA' },
  ENROLLMENT_UPDATED: { label: 'Cambio de matrícula', verb: 'modificó una matrícula', category: 'MATRICULA' },
  // Pagos
  PAYMENT_OBLIGATION_CREATED: { label: 'Nuevo cobro', verb: 'creó un cobro', category: 'PAGOS' },
  PAYMENT_OBLIGATIONS_BULK_CREATED: { label: 'Cobros masivos', verb: 'generó cobros para varios estudiantes', category: 'PAGOS' },
  PAYMENT_OBLIGATION_UPDATED: { label: 'Edición de cobro', verb: 'editó un cobro', category: 'PAGOS' },
  PAYMENT_OBLIGATION_CANCELLED: { label: 'Cobro anulado', verb: 'anuló un cobro', category: 'PAGOS' },
  PAYMENT_TRANSACTION_CREATED: { label: 'Pago registrado', verb: 'registró un pago', category: 'PAGOS' },
  PAYMENT_TRANSACTION_DELETED: { label: 'Pago eliminado', verb: 'eliminó un pago', category: 'PAGOS' },
  PAYMENT_TRANSACTION_VOIDED: { label: 'Recibo anulado', verb: 'anuló un recibo', category: 'PAGOS' },
  CASH_SESSION_OPENED: { label: 'Caja abierta', verb: 'abrió su caja', category: 'PAGOS' },
  CASH_SESSION_CLOSED: { label: 'Caja cerrada', verb: 'cerró una caja con arqueo', category: 'PAGOS' },
  CASH_SESSION_REVIEWED: { label: 'Cierre revisado', verb: 'revisó un cierre de caja', category: 'PAGOS' },
  CASH_SESSION_REOPENED: { label: 'Caja reabierta', verb: 'reabrió una caja cerrada', category: 'PAGOS' },
  CASH_EXPENSE_CREATED: { label: 'Egreso de caja', verb: 'registró un egreso de caja chica', category: 'PAGOS' },
  CASH_EXPENSE_VOIDED: { label: 'Egreso anulado', verb: 'anuló un egreso de caja chica', category: 'PAGOS' },
  PAYMENT_ADJUSTMENT_CREATED: { label: 'Ajuste a cuota', verb: 'registró un descuento, mora o nota de crédito', category: 'PAGOS' },
  PAYMENT_ADJUSTMENT_VOIDED: { label: 'Ajuste anulado', verb: 'anuló un ajuste a una cuota', category: 'PAGOS' },
  SCHOLARSHIP_CREATED: { label: 'Beca registrada', verb: 'registró una beca', category: 'PAGOS' },
  SCHOLARSHIP_APPLIED: { label: 'Beca aplicada', verb: 'aplicó una beca a cuotas pendientes', category: 'PAGOS' },
  SCHOLARSHIP_DEACTIVATED: { label: 'Beca desactivada', verb: 'desactivó una beca', category: 'PAGOS' },
  FINANCE_SETTINGS_UPDATED: { label: 'Configuración de mora', verb: 'cambió la tasa o los días de gracia de la mora', category: 'PAGOS' },
  LATE_FEES_APPLIED: { label: 'Moras cargadas', verb: 'cargó moras a pensiones vencidas', category: 'PAGOS' },
  STATEMENT_VIEWED: { label: 'Estado de cuenta', verb: 'consultó un estado de cuenta', category: 'PAGOS' },
  USER_FINANCE_ROLE_CHANGED: { label: 'Rol en finanzas', verb: 'cambió el rol en caja y tesorería de un usuario', category: 'PAGOS' },
  // Usuarios
  USER_CREATED: { label: 'Nuevo usuario', verb: 'creó un usuario', category: 'USUARIOS' },
  USER_UPDATED: { label: 'Edición de usuario', verb: 'editó un usuario', category: 'USUARIOS' },
  USER_DEACTIVATED: { label: 'Usuario desactivado', verb: 'desactivó un usuario', category: 'USUARIOS' },
  USER_PASSWORD_RESET: { label: 'Clave restablecida', verb: 'restableció la contraseña de un usuario', category: 'USUARIOS' },
  // Colegio y convivencia
  SCHOOL_UPDATED: { label: 'Datos del colegio', verb: 'actualizó los datos del colegio', category: 'COLEGIO' },
  AUTOMATION_UPDATED: { label: 'Automatización', verb: 'cambió una automatización', category: 'COLEGIO' },
  AUTOMATION_RUN_MANUAL: { label: 'Ejecución manual', verb: 'ejecutó manualmente una automatización', category: 'COLEGIO' },
  PAYMENT_REPORTED: { label: 'Pago reportado', verb: 'reportó un pago con voucher', category: 'PAGOS' },
  PAYMENT_REPORT_APPROVED: { label: 'Pago validado', verb: 'validó un pago reportado por la familia', category: 'PAGOS' },
  PAYMENT_REPORT_REJECTED: { label: 'Pago rechazado', verb: 'rechazó un pago reportado por la familia', category: 'PAGOS' },
  PAYMENT_INSTRUCTIONS_UPDATED: { label: 'Datos de cobro', verb: 'actualizó los datos de cobro (Yape/Plin/cuentas)', category: 'PAGOS' },
  SCHEDULE_GENERATED: { label: 'Horario automático', verb: 'aplicó un horario generado automáticamente', category: 'ACADEMICO' },
  SCHEDULE_SAVED: { label: 'Horario de aula', verb: 'actualizó el horario de un aula', category: 'ACADEMICO' },
  RESOURCE_SHARED: { label: 'Recurso compartido', verb: 'compartió un recurso en el banco docente', category: 'ACADEMICO' },
  RESOURCE_DELETED: { label: 'Recurso quitado', verb: 'quitó un recurso del banco docente', category: 'ACADEMICO' },
  RUBRIC_CREATED: { label: 'Nueva rúbrica', verb: 'creó una rúbrica', category: 'ACADEMICO' },
  RUBRIC_DELETED: { label: 'Rúbrica eliminada', verb: 'eliminó una rúbrica', category: 'ACADEMICO' },
  SECRETARIAT_SETTINGS_UPDATED: { label: 'Admisión y ratificación', verb: 'cambió la configuración de admisión y ratificación', category: 'MATRICULA' },
  ADMISSION_STATUS_CHANGED: { label: 'Postulación', verb: 'cambió el estado de una postulación', category: 'MATRICULA' },
  ADMISSION_CONVERTED: { label: 'Postulante registrado', verb: 'registró a un postulante admitido como estudiante', category: 'MATRICULA' },
  ENROLLMENT_RATIFIED: { label: 'Ratificación de matrícula', verb: 'respondió la ratificación de matrícula', category: 'MATRICULA' },
  DOCUMENT_REQUEST_UPDATED: { label: 'Trámite documentario', verb: 'actualizó un trámite documentario', category: 'MATRICULA' },
  DOCUMENT_HOLD_RELEASED: { label: 'Retención liberada', verb: 'liberó la retención por deuda de un certificado', category: 'PAGOS' },
  COMPLAINT_ANSWERED: { label: 'Libro de Reclamaciones', verb: 'respondió un reclamo del Libro de Reclamaciones', category: 'COLEGIO' },
  TUTORING_INTERVENTION_CREATED: { label: 'Plan de tutoría', verb: 'registró una intervención de tutoría', category: 'CONVIVENCIA' },
  CALENDAR_OFFICIAL_IMPORTED: { label: 'Fechas oficiales', verb: 'cargó los feriados y fechas cívicas en el calendario', category: 'COLEGIO' },
  CALENDAR_EVENT_CREATED: { label: 'Evento del calendario', verb: 'creó un evento en el calendario', category: 'COLEGIO' },
  CALENDAR_EVENT_UPDATED: { label: 'Edición de evento', verb: 'editó un evento del calendario', category: 'COLEGIO' },
  CALENDAR_EVENT_DELETED: { label: 'Evento eliminado', verb: 'eliminó un evento del calendario', category: 'COLEGIO' },
  ANNOUNCEMENT_RESPONSE: { label: 'Respuesta a comunicado', verb: 'respondió un comunicado', category: 'COLEGIO' },
  CLASSROOM_CREATED: { label: 'Nueva aula', verb: 'creó un aula', category: 'COLEGIO' },
  CLASSROOMS_BULK_CREATED: { label: 'Aulas creadas', verb: 'creó varias aulas', category: 'COLEGIO' },
  CLASSROOM_UPDATED: { label: 'Edición de aula', verb: 'editó un aula', category: 'COLEGIO' },
  CLASSROOM_TUTOR_CHANGED: { label: 'Cambio de tutor', verb: 'cambió el tutor de un aula', category: 'COLEGIO' },
  CLASSROOM_DELETED: { label: 'Aula eliminada', verb: 'eliminó un aula', category: 'COLEGIO' },
  INCIDENT_CREATED: { label: 'Nueva incidencia', verb: 'registró una incidencia', category: 'CONVIVENCIA' },
  INCIDENT_SISEVE_REGISTERED: { label: 'Reporte SíseVe', verb: 'registró el código SíseVe de un caso', category: 'CONVIVENCIA' },
};

export function actionsForCategory(category: AuditCategory): string[] {
  return Object.entries(ACTION_CATALOG).filter(([, v]) => v.category === category).map(([k]) => k);
}

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Soporte SaaS',
  SCHOOL_ADMIN: 'Dirección',
  ADMINISTRATIVE: 'Secretaría',
  TEACHER: 'Docente',
  PARENT: 'Apoderado(a)',
  STUDENT: 'Estudiante',
};
const LEVEL: Record<EducationLevel, string> = { INITIAL: 'Inicial', PRIMARY: 'Primaria', SECONDARY: 'Secundaria' };
const STATUS_LABEL: Record<string, string> = { OPEN: 'Abierto', REVIEW: 'En revisión', CLOSED: 'Cerrado' };
const ENROLLMENT_STATE: Record<string, string> = { REGISTERED: 'Matriculado', TRANSFERRED: 'Trasladado', WITHDRAWN: 'Retirado' };
const JUSTIFICATION_REASON: Record<string, string> = { MEDICAL: 'Salud', FAMILY: 'Motivo familiar', BEREAVEMENT: 'Duelo', TRANSPORT: 'Transporte', OTHER: 'Otro' };
const PAYMENT_METHOD: Record<string, string> = { CASH: 'Efectivo', BANK_TRANSFER: 'Transferencia', CREDIT_CARD: 'Tarjeta' };
const INCIDENT_TYPE: Record<string, string> = { MERITO: 'Mérito', DEMERITO: 'Demérito', ATENCION_TOPICO: 'Atención en tópico', CITACION_PADRES: 'Citación a padres' };

const gradeLabel = (level: EducationLevel, grade: number) => (level === 'INITIAL' ? `${grade} años` : `${grade}.° ${LEVEL[level]}`);
const periodLabel = (n: unknown) => (typeof n === 'number' ? `${n}.° periodo` : '');
const dateEs = (v: unknown) => {
  if (!v) return '';
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
};
const money = (v: unknown) => (v === null || v === undefined || v === '' ? '' : `S/ ${Number(v).toFixed(2)}`);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const str = (v: unknown) => (typeof v === 'string' ? v : undefined);

export interface PresentedLog {
  id: string;
  createdAt: Date;
  action: string;
  actionLabel: string;
  category: AuditCategory | null;
  categoryLabel: string;
  isCorrection: boolean;
  actorName: string;
  actorRole: string;
  actorRoleLabel: string;
  summary: string;
  details: Array<{ label: string; value: string }>;
}

/** Recolecta todos los IDs referidos para resolverlos con pocas consultas. */
function collectIds(logs: AuditLog[]) {
  const ids = { users: new Set<string>(), assignments: new Set<string>(), enrollments: new Set<string>(), competences: new Set<string>(), criteria: new Set<string>(), classrooms: new Set<string>(), students: new Set<string>(), years: new Set<string>(), areas: new Set<string>(), obligations: new Set<string>(), justifications: new Set<string>(), alerts: new Set<string>(), incidents: new Set<string>(), pickups: new Set<string>(), sessions: new Set<string>(), planCourses: new Set<string>() };
  const add = (set: Set<string>, v: unknown) => { if (typeof v === 'string' && v.length >= 32) set.add(v); };
  for (const l of logs) {
    add(ids.users, l.actorId);
    const a = obj(l.after);
    const items = Array.isArray(a.items) ? (a.items as unknown[]).map(obj) : [];
    const changes = Array.isArray(a.changes) ? (a.changes as unknown[]).map(obj) : [];
    switch (l.entity) {
      case 'CourseAssignment': add(ids.assignments, l.entityId); break;
      case 'Enrollment': add(ids.enrollments, l.entityId); break;
      case 'Student': add(ids.students, l.entityId); break;
      case 'User': add(ids.users, l.entityId); break;
      case 'AcademicYear': add(ids.years, l.entityId); break;
      case 'CurricularArea': add(ids.areas, l.entityId); break;
      case 'PaymentObligation': add(ids.obligations, l.entityId); break;
      case 'AttendanceJustification': add(ids.justifications, l.entityId); break;
      case 'AttendanceAlert': add(ids.alerts, l.entityId); break;
      case 'StudentIncident': add(ids.incidents, l.entityId); break;
      case 'AuthorizedPickup': add(ids.pickups, l.entityId); break;
      case 'Classroom': add(ids.classrooms, l.entityId); break;
      case 'CourseAttendanceSession': add(ids.sessions, l.entityId); break;
      case 'StudyPlanCourse': add(ids.planCourses, l.entityId); break;
      default: break;
    }
    add(ids.assignments, a.courseAssignmentId);
    add(ids.enrollments, a.enrollmentId);
    add(ids.competences, a.competenceId);
    add(ids.classrooms, a.classroomId);
    add(ids.users, a.teacherId);
    add(ids.users, a.tutorTeacherId);
    add(ids.users, obj(l.before).tutorTeacherId);
    add(ids.years, a.academicYearId);
    add(ids.years, a.fromAcademicYearId);
    add(ids.years, a.toAcademicYearId);
    add(ids.students, a.studentId);
    add(ids.obligations, a.obligationId);
    for (const it of items) { add(ids.enrollments, it.enrollmentId); add(ids.competences, it.competenceId); add(ids.criteria, it.criterionId); }
    for (const ch of changes) { add(ids.classrooms, ch.classroomId); add(ids.areas, ch.areaId); add(ids.users, ch.teacherId); }
    if (Array.isArray(a.criteria)) for (const c of (a.criteria as unknown[]).map(obj)) add(ids.criteria, c.criterionId);
  }
  return ids;
}

export async function presentAuditLogs(schoolId: string, logs: AuditLog[]): Promise<PresentedLog[]> {
  const ids = collectIds(logs);
  const arr = (s: Set<string>) => [...s];
  const studentName = (s: { lastNamePaternal: string; lastNameMaternal: string | null; firstNames: string }) =>
    `${s.firstNames.split(' ')[0]} ${s.lastNamePaternal}${s.lastNameMaternal ? ` ${s.lastNameMaternal}` : ''}`;
  const stSel = { firstNames: true, lastNamePaternal: true, lastNameMaternal: true } as const;

  const [users, assignments, enrollments, competences, criteria, classrooms, students, years, areas, obligations, justifications, alerts, incidents, pickups, sessions] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: arr(ids.users) } }, select: { id: true, firstName: true, lastNamePaternal: true, role: true } }),
    prisma.courseAssignment.findMany({ where: { id: { in: arr(ids.assignments) }, schoolId }, select: { id: true, area: { select: { name: true } }, classroom: { select: { educationLevel: true, grade: true, section: true } } } }),
    prisma.enrollment.findMany({ where: { id: { in: arr(ids.enrollments) }, schoolId }, select: { id: true, student: { select: stSel }, classroom: { select: { educationLevel: true, grade: true, section: true } } } }),
    prisma.curricularCompetence.findMany({ where: { id: { in: arr(ids.competences) } }, select: { id: true, name: true } }),
    prisma.evaluationCriterion.findMany({ where: { id: { in: arr(ids.criteria) }, schoolId }, select: { id: true, name: true, shortName: true } }),
    prisma.classroom.findMany({ where: { id: { in: arr(ids.classrooms) }, schoolId }, select: { id: true, educationLevel: true, grade: true, section: true } }),
    prisma.student.findMany({ where: { id: { in: arr(ids.students) }, schoolId }, select: { id: true, ...stSel } }),
    prisma.academicYear.findMany({ where: { id: { in: arr(ids.years) }, schoolId }, select: { id: true, year: true } }),
    prisma.curricularArea.findMany({ where: { id: { in: arr(ids.areas) }, schoolId }, select: { id: true, name: true } }),
    prisma.paymentObligation.findMany({ where: { id: { in: arr(ids.obligations) }, schoolId }, select: { id: true, title: true, enrollment: { select: { student: { select: stSel } } } } }),
    prisma.attendanceJustification.findMany({ where: { id: { in: arr(ids.justifications) }, schoolId }, select: { id: true, enrollment: { select: { student: { select: stSel } } } } }),
    prisma.attendanceAlert.findMany({ where: { id: { in: arr(ids.alerts) }, schoolId }, select: { id: true, enrollment: { select: { student: { select: stSel } } } } }),
    prisma.studentIncident.findMany({ where: { id: { in: arr(ids.incidents) }, schoolId }, select: { id: true, title: true, enrollment: { select: { student: { select: stSel } } } } }),
    prisma.authorizedPickup.findMany({ where: { id: { in: arr(ids.pickups) }, schoolId }, select: { id: true, fullName: true, student: { select: stSel } } }),
    prisma.courseAttendanceSession.findMany({ where: { id: { in: arr(ids.sessions) }, schoolId }, select: { id: true, courseAssignmentId: true } }),
  ]);
  // Sesiones de asistencia por curso -> su curso
  const extraAssignments = sessions.map((s) => s.courseAssignmentId).filter((id) => !assignments.some((a) => a.id === id));
  if (extraAssignments.length) {
    assignments.push(...(await prisma.courseAssignment.findMany({ where: { id: { in: extraAssignments } }, select: { id: true, area: { select: { name: true } }, classroom: { select: { educationLevel: true, grade: true, section: true } } } })));
  }

  const roomLabel = (c: { educationLevel: EducationLevel; grade: number; section: string }) => `${gradeLabel(c.educationLevel, c.grade)} "${c.section}"`;
  const userName = (id?: unknown) => { const u = users.find((x) => x.id === id); return u ? `${u.firstName} ${u.lastNamePaternal}` : undefined; };
  const courseName = (id?: unknown) => { const a = assignments.find((x) => x.id === id); return a ? `${a.area.name} · ${roomLabel(a.classroom)}` : undefined; };
  const enrollmentName = (id?: unknown) => { const e = enrollments.find((x) => x.id === id); return e ? studentName(e.student) : undefined; };
  const compName = (id?: unknown) => competences.find((x) => x.id === id)?.name;
  const critName = (id?: unknown) => { const c = criteria.find((x) => x.id === id); return c ? `${c.name} (${c.shortName})` : undefined; };
  const roomName = (id?: unknown) => { const c = classrooms.find((x) => x.id === id); return c ? roomLabel(c) : undefined; };
  const yearName = (id?: unknown) => years.find((x) => x.id === id)?.year?.toString();
  const areaName = (id?: unknown) => areas.find((x) => x.id === id)?.name;

  return logs.map((l) => {
    const meta = ACTION_CATALOG[l.action];
    const a = obj(l.after);
    const b = obj(l.before);
    const details: Array<{ label: string; value: string }> = [];
    const push = (label: string, value: unknown) => { if (value !== undefined && value !== null && value !== '') details.push({ label, value: String(value) }); };
    let target = '';

    switch (l.action) {
      case 'GRADES_SAVE':
      case 'GRADES_SAVE_CORRECTION': {
        target = courseName(l.entityId) ?? '';
        push('Periodo', periodLabel(a.periodNumber));
        push('Cantidad de notas', a.count);
        const items = Array.isArray(a.items) ? (a.items as unknown[]).map(obj) : [];
        items.slice(0, 15).forEach((it) => {
          const value = it.numericScore ?? it.literalScore ?? 'borrada';
          push(enrollmentName(it.enrollmentId) ?? 'Estudiante', `${compName(it.competenceId) ?? 'Competencia'} · ${critName(it.criterionId) ?? 'criterio'}: ${value}`);
        });
        if (items.length > 15) push('…', `y ${items.length - 15} notas más`);
        push('Motivo', a.reason);
        break;
      }
      case 'GRADES_FINAL_LETTER':
      case 'GRADES_FINAL_LETTER_CORRECTION':
        target = courseName(l.entityId) ?? '';
        push('Periodo', periodLabel(a.periodNumber));
        push('Estudiante', enrollmentName(a.enrollmentId));
        push('Competencia', compName(a.competenceId));
        push('Nuevo calificativo', a.finalLetter ?? 'Se volvió al calificativo sugerido');
        push('Motivo', a.reason);
        break;
      case 'GRADES_CONCLUSIONS':
      case 'GRADES_CONCLUSIONS_CORRECTION':
        target = courseName(l.entityId) ?? '';
        push('Periodo', periodLabel(a.periodNumber));
        push('Cantidad', a.count);
        push('Motivo', a.reason);
        break;
      case 'GRADES_SYNC_HOMEWORK_TO_MATRIX':
        target = courseName(a.courseAssignmentId ?? l.entityId) ?? '';
        push('Periodo', periodLabel(a.periodNumber));
        break;
      case 'COURSE_CRITERIA':
        target = courseName(l.entityId) ?? '';
        if (Array.isArray(a.criteria)) (a.criteria as unknown[]).map(obj).forEach((c) => push(critName(c.criterionId) ?? 'Criterio', c.weight ? `peso ${c.weight}` : 'peso del colegio'));
        break;
      case 'GRADES_CREATE_CRITERION':
      case 'GRADES_UPDATE_CRITERION':
        target = str(a.name) ?? '';
        push('Abreviatura', a.shortName);
        push('Peso', a.weight);
        push('Nivel', a.educationLevel ? LEVEL[a.educationLevel as EducationLevel] : 'Todos');
        break;
      case 'GRADING_SCALE_UPDATED':
        target = a.level ? LEVEL[a.level as EducationLevel] : '';
        push('AD desde', a.AD ?? obj(a.thresholds).AD);
        push('A desde', a.A ?? obj(a.thresholds).A);
        push('B desde', a.B ?? obj(a.thresholds).B);
        break;
      case 'PERIOD_STATUS':
        target = `${periodLabel(a.periodNumber)}${a.classroomId ? ` de ${roomName(a.classroomId)}` : ' (todo el colegio)'}`;
        push('Nuevo estado', STATUS_LABEL[String(a.status)] ?? a.status);
        if (a.force) push('Cerrado con pendientes', 'Sí');
        push('Fecha límite', dateEs(a.gradingDeadline));
        push('Motivo', a.reason);
        break;
      case 'ACADEMIC_YEAR_CREATE':
      case 'ACADEMIC_YEAR_UPDATE':
      case 'ACADEMIC_YEAR_ACTIVATE':
      case 'ACADEMIC_YEAR_DELETE':
        target = yearName(l.entityId) ? `Año ${yearName(l.entityId)}` : a.year ? `Año ${a.year}` : b.year ? `Año ${b.year}` : '';
        push('Inicio', dateEs(a.startDate));
        push('Fin', dateEs(a.endDate));
        push('Periodos', a.periodType === 'TRIMESTER' ? 'Trimestres' : a.periodType === 'BIMESTER' ? 'Bimestres' : undefined);
        push('Cálculo anual', a.annualCalculationMode === 'AVERAGE' ? 'Promedio de periodos' : a.annualCalculationMode === 'LAST_PERIOD' ? 'Último periodo' : undefined);
        break;
      case 'ACADEMIC_PLAN_TEMPLATE':
      case 'ACADEMIC_WORKSHOP':
      case 'ACADEMIC_SUBCOURSES': {
        const level = a.level ? LEVEL[a.level as EducationLevel] : '';
        const grades = Array.isArray(a.grades) ? (a.grades as number[]).map((g) => (a.level === 'INITIAL' ? `${g} años` : `${g}.°`)).join(', ') : '';
        target = `${level} ${grades}`.trim();
        push('Taller', a.name);
        push('Área', a.officialAreaCode);
        if (Array.isArray(a.subcourses)) push('Cursos', (a.subcourses as unknown[]).map(obj).map((s) => s.name).join(', '));
        break;
      }
      case 'ACADEMIC_PLAN_COPY':
      case 'TEACHING_LOAD_COPY':
        target = `del año ${yearName(a.fromAcademicYearId) ?? '?'} al ${yearName(a.toAcademicYearId) ?? '?'}`;
        break;
      case 'ACADEMIC_COURSE_COMPETENCES':
        target = areaName(l.entityId) ?? '';
        break;
      case 'TEACHING_LOAD_SAVE': {
        const changes = Array.isArray(a.changes) ? (a.changes as unknown[]).map(obj) : [];
        if (a.classroomId && a.teacherId) {
          target = roomName(a.classroomId) ?? '';
          push('Todo el aula asignada a', userName(a.teacherId));
        } else {
          target = `${changes.length} cambio(s)`;
          changes.slice(0, 15).forEach((c) => push(`${areaName(c.areaId) ?? 'Curso'} · ${roomName(c.classroomId) ?? ''}`, c.teacherId ? userName(c.teacherId) ?? 'Docente' : 'Sin docente'));
        }
        break;
      }
      case 'ATTENDANCE_CLOSED_MANUALLY':
        target = a.classroomId ? roomName(a.classroomId) ?? '' : 'todo el colegio';
        push('Fecha', dateEs(a.date));
        push('Faltas registradas', a.closedCount);
        break;
      case 'ATTENDANCE_CHECKOUT':
        push('Tipo de recojo', a.pickupType === 'SELF' ? 'Salió solo' : a.pickupType === 'GUARDIAN' ? 'Apoderado' : a.pickupType === 'AUTHORIZED' ? 'Persona autorizada' : a.pickupType);
        push('Salida anticipada', a.earlyLeaveReason);
        break;
      case 'ATTENDANCE_JUSTIFICATION_CREATED':
        target = enrollmentName(a.enrollmentId) ?? '';
        push('Motivo', JUSTIFICATION_REASON[String(a.reason)] ?? a.reason);
        push('Desde', dateEs(a.dateFrom));
        push('Hasta', dateEs(a.dateTo));
        break;
      case 'ATTENDANCE_JUSTIFICATION_APPROVED':
      case 'ATTENDANCE_JUSTIFICATION_REJECTED': {
        const j = justifications.find((x) => x.id === l.entityId);
        target = j ? studentName(j.enrollment.student) : '';
        push('Observación', a.reviewNote);
        break;
      }
      case 'ATTENDANCE_ALERT_ATTENDED':
      case 'ATTENDANCE_ALERT_FAMILY_CITED': {
        const al = alerts.find((x) => x.id === l.entityId);
        target = al ? studentName(al.enrollment.student) : '';
        push('Fecha de citación', dateEs(a.citationDate));
        push('Nota', a.note);
        break;
      }
      case 'COURSE_ATTENDANCE_SAVED':
        target = courseName(a.courseAssignmentId) ?? '';
        push('Fecha', dateEs(a.date));
        push('Hora pedagógica', a.periodLabel);
        push('Estudiantes', a.recordsCount);
        break;
      case 'PICKUP_CREATED':
      case 'PICKUP_UPDATED':
      case 'PICKUP_DEACTIVATED': {
        const p = pickups.find((x) => x.id === l.entityId);
        target = p ? `${p.fullName} (para ${studentName(p.student)})` : str(a.fullName) ?? '';
        push('Parentesco', a.relationship);
        break;
      }
      case 'STUDENT_CREATED':
      case 'STUDENT_ENROLLED_FICHA':
      case 'STUDENT_UPDATED':
      case 'STUDENT_DELETED':
      case 'STUDENT_PASSWORD_RESET':
      case 'STUDENT_DATA_EXPORTED': {
        const s = students.find((x) => x.id === l.entityId);
        const src = a.firstNames ? a : b;
        target = s ? studentName(s) : src.firstNames ? `${src.firstNames} ${src.lastNamePaternal ?? ''}`.trim() : '';
        push('DNI', src.documentId);
        break;
      }
      case 'CREDENTIALS_BULK_GENERATED':
        target = roomName(l.entityId) ?? '';
        push('Para', a.target === 'GUARDIANS' ? 'Apoderados' : a.target === 'STUDENTS' ? 'Estudiantes' : a.target);
        push('Cantidad', a.count);
        break;
      case 'ENROLLMENT_CREATED':
      case 'ENROLLMENT_UPDATED': {
        const e = enrollments.find((x) => x.id === l.entityId);
        target = e ? `${studentName(e.student)} · ${roomLabel(e.classroom)}` : '';
        push('Estado', ENROLLMENT_STATE[String(a.enrollmentState)]);
        push('Año', yearName(a.academicYearId));
        break;
      }
      case 'PAYMENT_OBLIGATION_CREATED':
      case 'PAYMENT_OBLIGATION_UPDATED':
      case 'PAYMENT_OBLIGATION_CANCELLED': {
        const o = obligations.find((x) => x.id === l.entityId);
        target = o ? `${o.title} de ${studentName(o.enrollment.student)}` : str(a.title) ?? '';
        push('Monto', money(a.amountDue));
        push('Vence', dateEs(a.dueDate));
        break;
      }
      case 'PAYMENT_OBLIGATIONS_BULK_CREATED':
        target = str(a.title) ?? '';
        push('Aula', roomName(a.classroomId) ?? (a.classroomId ? undefined : 'Todo el colegio'));
        push('Monto', money(a.amountDue));
        push('Vence', dateEs(a.dueDate));
        break;
      case 'PAYMENT_TRANSACTION_CREATED':
      case 'PAYMENT_TRANSACTION_DELETED': {
        const o = obligations.find((x) => x.id === a.obligationId);
        target = o ? `${o.title} de ${studentName(o.enrollment.student)}` : '';
        push('Monto', money(a.amountPaid));
        push('Medio de pago', PAYMENT_METHOD[String(a.paymentMethod)] ?? a.paymentMethod);
        push('Recibo', a.receiptNumber);
        break;
      }
      case 'USER_CREATED':
      case 'USER_UPDATED':
      case 'USER_DEACTIVATED':
      case 'USER_PASSWORD_RESET': {
        const name = userName(l.entityId) ?? (a.firstName ? `${a.firstName} ${a.lastNamePaternal ?? ''}`.trim() : '');
        const role = users.find((x) => x.id === l.entityId)?.role ?? str(a.role);
        target = role ? `${name} (${ROLE_LABEL[role] ?? role})` : name;
        break;
      }
      case 'SCHOOL_UPDATED':
        target = str(a.name) ?? '';
        break;
      case 'CLASSROOM_CREATED':
      case 'CLASSROOM_UPDATED':
      case 'CLASSROOM_TUTOR_CHANGED':
      case 'CLASSROOM_DELETED': {
        const src = a.educationLevel ? a : b;
        target = roomName(l.entityId) ?? (src.educationLevel ? `${gradeLabel(src.educationLevel as EducationLevel, Number(src.grade))} "${src.section}"` : '');
        if (l.action === 'CLASSROOM_TUTOR_CHANGED') {
          push('Tutor anterior', userName(b.tutorTeacherId) ?? 'Sin tutor');
          push('Nuevo tutor', userName(a.tutorTeacherId) ?? 'Sin tutor');
        } else {
          push('Sección', a.section);
          push('Capacidad', a.capacity);
          push('Tutor', a.tutorTeacherId ? userName(a.tutorTeacherId) : undefined);
        }
        break;
      }
      case 'CLASSROOMS_BULK_CREATED':
        target = Array.isArray(a.created) ? `${(a.created as string[]).length} aula(s)` : '';
        if (Array.isArray(a.created)) push('Aulas', (a.created as string[]).join(', '));
        break;
      case 'INCIDENT_CREATED':
      case 'INCIDENT_SISEVE_REGISTERED': {
        const inc = incidents.find((x) => x.id === l.entityId);
        target = inc ? `"${inc.title}" de ${studentName(inc.enrollment.student)}` : str(a.title) ?? '';
        push('Tipo', INCIDENT_TYPE[String(a.type)] ?? a.type);
        push('Código SíseVe', a.siseveCode);
        break;
      }
      default:
        break;
    }

    const actorName = userName(l.actorId) ?? l.actorEmail ?? 'Usuario eliminado';
    const roleLabel = ROLE_LABEL[l.actorRole] ?? l.actorRole;
    const verb = meta?.verb ?? `realizó la acción "${l.action.toLowerCase().replace(/_/g, ' ')}"`;
    const summary = `${actorName} (${roleLabel}) ${verb}${target ? ` — ${target}` : ''}`;
    return {
      id: l.id,
      createdAt: l.createdAt,
      action: l.action,
      actionLabel: meta?.label ?? l.action,
      category: meta?.category ?? null,
      categoryLabel: meta ? CATEGORY_LABEL[meta.category] : 'Otros',
      isCorrection: l.action.endsWith('_CORRECTION'),
      actorName,
      actorRole: l.actorRole,
      actorRoleLabel: roleLabel,
      summary,
      details,
    };
  });
}
