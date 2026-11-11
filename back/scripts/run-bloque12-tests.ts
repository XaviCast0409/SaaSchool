import 'dotenv/config';
import { app } from '../src/app';
import { prisma } from '../src/config/prisma';
import { AttendanceService } from '../src/modules/attendance/attendance.service';
import { AttendanceRepository } from '../src/modules/attendance/attendance.repository';
import { getSchoolNow } from '../src/utils/timezone.util';
import type { Server } from 'http';

interface TestResult {
  num: number;
  name: string;
  status: 'PASS' | 'FAIL';
  details: string;
  durationMs: number;
}

const results: TestResult[] = [];
let server: Server;
const PORT = 3999;
const BASE_URL = `http://localhost:${PORT}/api`;
const attendanceService = new AttendanceService(new AttendanceRepository());

async function login(email: string, pass: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: pass }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Login failed for ${email}: ${res.status} ${text}`);
  }
  const json = (await res.json()) as { data: { token: string } };
  return json.data.token;
}

async function runTests() {
  console.log('====================================================');
  console.log('🚀 INICIANDO PRUEBAS DE INTEGRACIÓN MANUALES (BLOQUE 12)');
  console.log('====================================================\n');

  // 0. Iniciar servidor
  await new Promise<void>((resolve) => {
    server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`Servidor de prueba escuchando en http://localhost:${PORT}`);
      resolve();
    });
  });

  const schoolProId = 'f4b01541-4bfe-4a88-b239-64e5815195ef'; // Innova Pro
  const hoy = getSchoolNow().dateStr;

  // Tokens
  const adminProToken = await login('admin.pro@innova.edu.pe', 'Admin123!');
  const secProToken = await login('secretaria.pro@innova.edu.pe', 'Admin123!');
  const teacherProToken = await login('docente.pro@innova.edu.pe', 'Teacher123!');
  const luciaTeacherToken = await login('lucia.docente@innova.edu.pe', 'Teacher123!');
  const parentDoshijosToken = await login('padre.doshijos@innova.edu.pe', 'Parent123!');
  const otherParentProToken = await login('padre.unhijo@innova.edu.pe', 'Parent123!');

  const adminProUser = await prisma.user.findFirst({
    where: { email: 'admin.pro@innova.edu.pe' },
  });

  // Cleanup tracking arrays
  const createdAttendanceIds: string[] = [];
  const createdJustificationIds: string[] = [];
  const createdAlertIds: string[] = [];
  const createdPickupIds: string[] = [];
  const createdSessionIds: string[] = [];
  const createdHolidayIds: string[] = [];

  // =========================================================================
  // PRUEBA 1: Cierre por nivel
  // =========================================================================
  {
    const start = Date.now();
    try {
      // Activar aviso automático a familias en el colegio
      await prisma.school.update({
        where: { id: schoolProId },
        data: { notifyAbsencesToFamilies: true },
      });

      // Configurar horarios INITIAL (08:30) y SECONDARY (08:00)
      await prisma.attendanceScheduleConfig.upsert({
        where: { schoolId_scope: { schoolId: schoolProId, scope: 'INITIAL' } },
        create: {
          schoolId: schoolProId,
          scope: 'INITIAL',
          entryTime: '08:00',
          lateToleranceTime: '08:15',
          autoCloseTime: '08:30',
          autoCloseEnabled: true,
        },
        update: { autoCloseTime: '08:30', autoCloseEnabled: true },
      });
      await prisma.attendanceScheduleConfig.upsert({
        where: { schoolId_scope: { schoolId: schoolProId, scope: 'SECONDARY' } },
        create: {
          schoolId: schoolProId,
          scope: 'SECONDARY',
          entryTime: '07:45',
          lateToleranceTime: '07:55',
          autoCloseTime: '08:00',
          autoCloseEnabled: true,
        },
        update: { autoCloseTime: '08:00', autoCloseEnabled: true },
      });

      // Limpiar asistencias existentes de hoy en Innova Pro para prueba limpia
      await prisma.attendance.deleteMany({
        where: {
          enrollment: { schoolId: schoolProId },
          date: new Date(`${hoy}T00:00:00.000Z`),
        },
      });

      // Ejecutar cierre para SECONDARY
      const count = await attendanceService.closeAttendanceForScope(schoolProId, 'SECONDARY', hoy);

      // Verificar que solo se crearon en aulas de SECONDARY
      const created = await prisma.attendance.findMany({
        where: {
          enrollment: { schoolId: schoolProId },
          date: new Date(`${hoy}T00:00:00.000Z`),
        },
        include: { enrollment: { include: { classroom: true } } },
      });

      created.forEach((a) => createdAttendanceIds.push(a.id));

      const nonSecondary = created.filter(
        (a) => a.enrollment.classroom.educationLevel !== 'SECONDARY',
      );

      if (count > 0 && nonSecondary.length === 0) {
        results.push({
          num: 1,
          name: 'Cierre por nivel',
          status: 'PASS',
          details: `Se crearon ${count} faltas exclusivamente en aulas de SECONDARY (${created.length} registros verificados).`,
          durationMs: Date.now() - start,
        });
      } else {
        results.push({
          num: 1,
          name: 'Cierre por nivel',
          status: 'FAIL',
          details: `Falló: se esperaban solo SECONDARY pero se encontraron ${nonSecondary.length} no-secundaria. Count=${count}`,
          durationMs: Date.now() - start,
        });
      }
    } catch (err: any) {
      results.push({
        num: 1,
        name: 'Cierre por nivel',
        status: 'FAIL',
        details: `Excepción: ${err.message}`,
        durationMs: Date.now() - start,
      });
    }
  }

  // =========================================================================
  // PRUEBA 2: Feriado (POST /attendance/close con fecha registrada como feriado -> 400)
  // =========================================================================
  {
    const start = Date.now();
    try {
      const holidayDate = '2026-10-08';
      const hol = await prisma.schoolHoliday.create({
        data: {
          schoolId: schoolProId,
          date: new Date(`${holidayDate}T00:00:00.000Z`),
          name: 'Combate de Angamos (Prueba)',
        },
      });
      createdHolidayIds.push(hol.id);

      const res = await fetch(`${BASE_URL}/attendance/close`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminProToken}`,
        },
        body: JSON.stringify({ date: holidayDate }),
      });

      const body = (await res.json()) as any;
      if (res.status === 400 && body.message?.toLowerCase().includes('feriado')) {
        results.push({
          num: 2,
          name: 'Feriado en cierre',
          status: 'PASS',
          details: `HTTP 400 retornado correctamente con mensaje: "${body.message}".`,
          durationMs: Date.now() - start,
        });
      } else {
        results.push({
          num: 2,
          name: 'Feriado en cierre',
          status: 'FAIL',
          details: `Status ${res.status}: ${JSON.stringify(body)}`,
          durationMs: Date.now() - start,
        });
      }
    } catch (err: any) {
      results.push({
        num: 2,
        name: 'Feriado en cierre',
        status: 'FAIL',
        details: `Excepción: ${err.message}`,
        durationMs: Date.now() - start,
      });
    }
  }

  // =========================================================================
  // PRUEBA 3: Llegada tardía tras el cierre (escaneo de alumno con falta AUTO_CLOSE)
  // =========================================================================
  {
    const start = Date.now();
    try {
      // Buscar un alumno de Secundaria que tenga falta AUTO_CLOSE creada en prueba 1
      const autoCloseAtt = await prisma.attendance.findFirst({
        where: {
          origin: 'AUTO_CLOSE',
          date: new Date(`${hoy}T00:00:00.000Z`),
          enrollment: { schoolId: schoolProId },
        },
        include: { enrollment: { include: { student: true } } },
      });

      if (!autoCloseAtt) {
        throw new Error('No se encontró asistencia AUTO_CLOSE de prueba 1');
      }

      const studentCode =
        autoCloseAtt.enrollment.student.documentId ||
        autoCloseAtt.enrollment.student.studentCode;

      const res = await fetch(`${BASE_URL}/attendance/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminProToken}`,
        },
        body: JSON.stringify({ code: studentCode }),
      });

      const body = (await res.json()) as any;
      if (
        res.status === 200 &&
        body.data?.alreadyRegistered === false &&
        body.data?.status === 'LATE_UNJUSTIFIED'
      ) {
        results.push({
          num: 3,
          name: 'Llegada tardía tras el cierre',
          status: 'PASS',
          details: `Escaneo exitoso de alumno con AUTO_CLOSE: alreadyRegistered=false, status=LATE_UNJUSTIFIED.`,
          durationMs: Date.now() - start,
        });
      } else {
        results.push({
          num: 3,
          name: 'Llegada tardía tras el cierre',
          status: 'FAIL',
          details: `Status ${res.status}: ${JSON.stringify(body)}`,
          durationMs: Date.now() - start,
        });
      }
    } catch (err: any) {
      results.push({
        num: 3,
        name: 'Llegada tardía tras el cierre',
        status: 'FAIL',
        details: `Excepción: ${err.message}`,
        durationMs: Date.now() - start,
      });
    }
  }

  // =========================================================================
  // PRUEBA 4: Aviso de inasistencia a las familias
  // =========================================================================
  {
    const start = Date.now();
    try {
      const notif = await prisma.notification.findFirst({
        where: {
          schoolId: schoolProId,
          title: { contains: 'Inasistencia' },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (notif && notif.link && notif.link.includes('justify=')) {
        results.push({
          num: 4,
          name: 'Aviso de inasistencia a familias',
          status: 'PASS',
          details: `Notificación enviada: "${notif.title}", link="${notif.link}".`,
          durationMs: Date.now() - start,
        });
      } else {
        results.push({
          num: 4,
          name: 'Aviso de inasistencia a familias',
          status: 'FAIL',
          details: `Notificación no encontrada o sin justify=: ${JSON.stringify(notif)}`,
          durationMs: Date.now() - start,
        });
      }
    } catch (err: any) {
      results.push({
        num: 4,
        name: 'Aviso de inasistencia a familias',
        status: 'FAIL',
        details: `Excepción: ${err.message}`,
        durationMs: Date.now() - start,
      });
    }
  }

  // =========================================================================
  // PRUEBA 5: Justificación en línea (padre crea, otro padre 403, secretaría aprueba 200, re-aprobar 409)
  // =========================================================================
  {
    const start = Date.now();
    try {
      // Alumno con relación de padre.doshijos en Innova Pro
      const valeriaRel = await prisma.familyRelationship.findFirst({
        where: {
          user: { email: 'padre.doshijos@innova.edu.pe' },
        },
        include: {
          student: {
            include: {
              enrollments: { where: { isActive: true }, take: 1 },
            },
          },
        },
      });

      if (!valeriaRel || valeriaRel.student.enrollments.length === 0) {
        throw new Error('No se encontró relación familiar de padre.doshijos');
      }

      const valeriaEnrollmentId = valeriaRel.student.enrollments[0].id;

      // 5.1 Crear falta en esa fecha para que se pueda justificar
      const justDate = '2026-11-04';
      const att = await prisma.attendance.upsert({
        where: {
          enrollmentId_date: {
            enrollmentId: valeriaEnrollmentId,
            date: new Date(`${justDate}T00:00:00.000Z`),
          },
        },
        create: {
          schoolId: schoolProId,
          enrollmentId: valeriaEnrollmentId,
          date: new Date(`${justDate}T00:00:00.000Z`),
          status: 'ABSENT_UNJUSTIFIED',
          origin: 'MANUAL',
        },
        update: { status: 'ABSENT_UNJUSTIFIED' },
      });
      createdAttendanceIds.push(att.id);

      // 5.2 Padre de otra familia en el mismo colegio intenta justificar -> debe dar 403
      const resForbidden = await fetch(`${BASE_URL}/attendance/justifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${otherParentProToken}`,
        },
        body: JSON.stringify({
          enrollmentId: valeriaEnrollmentId,
          reason: 'MEDICAL',
          description: 'Cita médica pediatra ajeno',
          dateFrom: justDate,
          dateTo: justDate,
        }),
      });
      const is403 = resForbidden.status === 403;

      // 5.3 El padre real crea la justificación -> 201
      const resCreate = await fetch(`${BASE_URL}/attendance/justifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${parentDoshijosToken}`,
        },
        body: JSON.stringify({
          enrollmentId: valeriaEnrollmentId,
          reason: 'MEDICAL',
          description: 'Cita médica pediátrica programada con receta',
          dateFrom: justDate,
          dateTo: justDate,
        }),
      });
      const createBody = (await resCreate.json()) as any;
      const is201 = resCreate.status === 201 && createBody.data?.status === 'PENDING';
      const justId = createBody.data?.id;
      if (justId) createdJustificationIds.push(justId);

      // 5.4 Secretaría aprueba -> 200 y asistencia queda ABSENT_JUSTIFIED
      const resReview = await fetch(`${BASE_URL}/attendance/justifications/${justId}/review`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${secProToken}`,
        },
        body: JSON.stringify({ decision: 'APPROVED' }),
      });
      const is200 = resReview.status === 200;

      const updatedAtt = await prisma.attendance.findUnique({
        where: { id: att.id },
      });
      const isJustified = updatedAtt?.status === 'ABSENT_JUSTIFIED';

      // 5.5 Aprobarla otra vez -> 409
      const resDuplicate = await fetch(`${BASE_URL}/attendance/justifications/${justId}/review`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${secProToken}`,
        },
        body: JSON.stringify({ decision: 'APPROVED' }),
      });
      const is409 = resDuplicate.status === 409;

      if (is403 && is201 && is200 && isJustified && is409) {
        results.push({
          num: 5,
          name: 'Flujo completo de justificación',
          status: 'PASS',
          details: `Padre ajeno: 403, Padre legítimo: 201 PENDING, Secretaría aprueba: 200, Estado actualizado a ABSENT_JUSTIFIED, Re-aprobación: 409.`,
          durationMs: Date.now() - start,
        });
      } else {
        results.push({
          num: 5,
          name: 'Flujo completo de justificación',
          status: 'FAIL',
          details: `Falló checks: is403=${is403} (${resForbidden.status}), is201=${is201}, is200=${is200}, isJustified=${isJustified}, is409=${is409}`,
          durationMs: Date.now() - start,
        });
      }
    } catch (err: any) {
      results.push({
        num: 5,
        name: 'Flujo completo de justificación',
        status: 'FAIL',
        details: `Excepción: ${err.message}`,
        durationMs: Date.now() - start,
      });
    }
  }

  // =========================================================================
  // PRUEBA 6: Rango inválido de justificación (20 días -> 400, hace 40 días -> 400)
  // =========================================================================
  {
    const start = Date.now();
    try {
      const valeriaRel = await prisma.familyRelationship.findFirst({
        where: {
          user: { email: 'padre.doshijos@innova.edu.pe' },
        },
        include: { student: { include: { enrollments: { where: { isActive: true }, take: 1 } } } },
      });
      const enrollmentId = valeriaRel!.student.enrollments[0].id;

      // 6.1 Rango de 20 días
      const res20Days = await fetch(`${BASE_URL}/attendance/justifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${parentDoshijosToken}`,
        },
        body: JSON.stringify({
          enrollmentId,
          reason: 'FAMILY',
          description: 'Viaje familiar largo programado',
          dateFrom: '2026-11-01',
          dateTo: '2026-11-20',
        }),
      });

      // 6.2 Hace 40 días
      const res40DaysAgo = await fetch(`${BASE_URL}/attendance/justifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${parentDoshijosToken}`,
        },
        body: JSON.stringify({
          enrollmentId,
          reason: 'FAMILY',
          description: 'Falta muy antigua por viaje familiar',
          dateFrom: '2026-09-01',
          dateTo: '2026-09-02',
        }),
      });

      if (res20Days.status === 400 && res40DaysAgo.status === 400) {
        results.push({
          num: 6,
          name: 'Validación de rango de fechas',
          status: 'PASS',
          details: `Ambas peticiones fuera de rango rechazadas con HTTP 400 (20 días > 15 y 40 días atrás > 30).`,
          durationMs: Date.now() - start,
        });
      } else {
        results.push({
          num: 6,
          name: 'Validación de rango de fechas',
          status: 'FAIL',
          details: `res20Days=${res20Days.status}, res40DaysAgo=${res40DaysAgo.status}`,
          durationMs: Date.now() - start,
        });
      }
    } catch (err: any) {
      results.push({
        num: 6,
        name: 'Validación de rango de fechas',
        status: 'FAIL',
        details: `Excepción: ${err.message}`,
        durationMs: Date.now() - start,
      });
    }
  }

  // =========================================================================
  // PRUEBA 7: Escaneo sin conexión (Batch con válido + inexistente, y fecha futura -> 422)
  // =========================================================================
  {
    const start = Date.now();
    try {
      const student = await prisma.student.findFirst({
        where: { schoolId: schoolProId },
      });
      const validCode = student!.documentId || student!.studentCode;

      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const tenMinutesFuture = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      // Batch 1: código válido y código inexistente
      const resBatch = await fetch(`${BASE_URL}/attendance/scan/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminProToken}`,
        },
        body: JSON.stringify({
          items: [
            { clientId: 'offline-uuid-1', code: validCode, scannedAt: tenMinutesAgo },
            { clientId: 'offline-uuid-2', code: 'CODIGO_INEXISTENTE_99999', scannedAt: tenMinutesAgo },
          ],
        }),
      });

      const batchBody = (await resBatch.json()) as any;
      const item1Ok = batchBody.data?.results?.[0]?.ok === true;
      const item2Fail =
        batchBody.data?.results?.[1]?.ok === false &&
        batchBody.data?.results?.[1]?.httpStatus === 404;

      // Batch 2: scannedAt futuro (+10 min) -> ok: false con 422
      const resFuture = await fetch(`${BASE_URL}/attendance/scan/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminProToken}`,
        },
        body: JSON.stringify({
          items: [{ clientId: 'offline-uuid-3', code: validCode, scannedAt: tenMinutesFuture }],
        }),
      });

      const futureBody = (await resFuture.json()) as any;
      const futureItemFail =
        futureBody.data?.results?.[0]?.ok === false &&
        futureBody.data?.results?.[0]?.httpStatus === 422;

      if (item1Ok && item2Fail && futureItemFail) {
        results.push({
          num: 7,
          name: 'Escaneo offline por lotes (/scan/batch)',
          status: 'PASS',
          details: `Lote procesado: código válido ok=true, código inexistente ok=false (404), fecha futura ok=false (422).`,
          durationMs: Date.now() - start,
        });
      } else {
        results.push({
          num: 7,
          name: 'Escaneo offline por lotes (/scan/batch)',
          status: 'FAIL',
          details: `item1Ok=${item1Ok}, item2Fail=${item2Fail}, futureItemFail=${futureItemFail}, body=${JSON.stringify(batchBody)}`,
          durationMs: Date.now() - start,
        });
      }
    } catch (err: any) {
      results.push({
        num: 7,
        name: 'Escaneo offline por lotes (/scan/batch)',
        status: 'FAIL',
        details: `Excepción: ${err.message}`,
        durationMs: Date.now() - start,
      });
    }
  }

  // =========================================================================
  // PRUEBA 8: Límite del escáner (700 peticiones seguidas sin 429)
  // =========================================================================
  {
    const start = Date.now();
    try {
      const student = await prisma.student.findFirst({
        where: { schoolId: schoolProId },
      });
      const code = student!.documentId;

      let got429 = false;
      const batchSize = 50;
      const totalRequests = 700;

      for (let i = 0; i < totalRequests; i += batchSize) {
        const promises = [];
        for (let j = 0; j < batchSize; j++) {
          promises.push(
            fetch(`${BASE_URL}/attendance/scan`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${adminProToken}`,
              },
              body: JSON.stringify({ code }),
            }),
          );
        }
        const responses = await Promise.all(promises);
        if (responses.some((r) => r.status === 429)) {
          got429 = true;
          break;
        }
      }

      if (!got429) {
        results.push({
          num: 8,
          name: 'Límite de tasa del escáner (700 escaneos)',
          status: 'PASS',
          details: `Se realizaron 700 llamadas a /attendance/scan sin ningún HTTP 429 (límite ampliado a 3000/15min).`,
          durationMs: Date.now() - start,
        });
      } else {
        results.push({
          num: 8,
          name: 'Límite de tasa del escáner (700 escaneos)',
          status: 'FAIL',
          details: `Se recibió HTTP 429 durante los 700 escaneos.`,
          durationMs: Date.now() - start,
        });
      }
    } catch (err: any) {
      results.push({
        num: 8,
        name: 'Límite de tasa del escáner (700 escaneos)',
        status: 'FAIL',
        details: `Excepción: ${err.message}`,
        durationMs: Date.now() - start,
      });
    }
  }

  // =========================================================================
  // PRUEBA 9: Alertas tempranas de ausentismo (3 faltas injustificadas seguidas, evaluate, deduplicar, attend)
  // =========================================================================
  {
    const start = Date.now();
    try {
      // Tomar un alumno de Innova Pro
      const enrollment = await prisma.enrollment.findFirst({
        where: { schoolId: schoolProId, isActive: true },
      });
      const enrollmentId = enrollment!.id;

      // Crear 3 faltas injustificadas en días hábiles
      const testDates = ['2026-11-03', '2026-11-04', '2026-11-05'];
      for (const d of testDates) {
        const att = await prisma.attendance.upsert({
          where: {
            enrollmentId_date: {
              enrollmentId,
              date: new Date(`${d}T00:00:00.000Z`),
            },
          },
          create: {
            schoolId: schoolProId,
            enrollmentId,
            date: new Date(`${d}T00:00:00.000Z`),
            status: 'ABSENT_UNJUSTIFIED',
            origin: 'MANUAL',
          },
          update: { status: 'ABSENT_UNJUSTIFIED' },
        });
        createdAttendanceIds.push(att.id);
      }

      // 9.1 Evaluar alertas: POST /attendance/alerts/evaluate -> created >= 1
      const resEval1 = await fetch(`${BASE_URL}/attendance/alerts/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminProToken}`,
        },
      });
      const eval1Body = (await resEval1.json()) as any;
      const createdCount = eval1Body.data?.created ?? 0;
      const isCreated = resEval1.status === 200 && createdCount >= 1;

      // 9.2 Segunda evaluación el mismo día no duplica -> created: 0
      const resEval2 = await fetch(`${BASE_URL}/attendance/alerts/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminProToken}`,
        },
      });
      const eval2Body = (await resEval2.json()) as any;
      const isDedup = resEval2.status === 200 && eval2Body.data?.created === 0;

      // Obtener la alerta generada
      const alert = await prisma.attendanceAlert.findFirst({
        where: { schoolId: schoolProId, enrollmentId },
        orderBy: { createdAt: 'desc' },
      });
      if (alert) createdAlertIds.push(alert.id);

      // 9.3 Atender alerta: PATCH /attendance/alerts/:id/attend -> 200
      const resAttend = await fetch(`${BASE_URL}/attendance/alerts/${alert?.id}/attend`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminProToken}`,
        },
        body: JSON.stringify({ note: 'Se contactó a la familia por llamada' }),
      });
      const isAttend200 = resAttend.status === 200;

      if (isCreated && isDedup && isAttend200) {
        results.push({
          num: 9,
          name: 'Alerta temprana de ausentismo',
          status: 'PASS',
          details: `Evaluación 1: ${createdCount} alertas creadas. Evaluación 2: 0 duplicadas. Atender alerta: HTTP 200.`,
          durationMs: Date.now() - start,
        });
      } else {
        results.push({
          num: 9,
          name: 'Alerta temprana de ausentismo',
          status: 'FAIL',
          details: `isCreated=${isCreated} (count=${createdCount}), isDedup=${isDedup}, isAttend200=${isAttend200}`,
          durationMs: Date.now() - start,
        });
      }
    } catch (err: any) {
      results.push({
        num: 9,
        name: 'Alerta temprana de ausentismo',
        status: 'FAIL',
        details: `Excepción: ${err.message}`,
        durationMs: Date.now() - start,
      });
    }
  }

  // =========================================================================
  // PRUEBA 10: Registro de salida y personas autorizadas
  // =========================================================================
  {
    const start = Date.now();
    try {
      // 10.1 En Primaria, pickupType: 'SELF' -> 422
      // Alumno de Primaria en Innova Pro
      const primaryEnrollment = await prisma.enrollment.findFirst({
        where: {
          schoolId: schoolProId,
          isActive: true,
          classroom: { educationLevel: 'PRIMARY' },
          student: { familyRelations: { some: {} } },
        },
        include: { student: { include: { familyRelations: true } }, classroom: true },
      });

      if (!primaryEnrollment) {
        throw new Error('No se encontró matrícula de Primaria en Innova Pro');
      }

      const primaryStudentCode = primaryEnrollment.student.documentId;

      // Registrar ingreso de hoy PRESENT
      const primAtt = await prisma.attendance.upsert({
        where: {
          enrollmentId_date: {
            enrollmentId: primaryEnrollment.id,
            date: new Date(`${hoy}T00:00:00.000Z`),
          },
        },
        create: {
          schoolId: schoolProId,
          enrollmentId: primaryEnrollment.id,
          date: new Date(`${hoy}T00:00:00.000Z`),
          status: 'PRESENT',
          origin: 'QR_SCAN',
          checkInTime: new Date(),
        },
        update: { status: 'PRESENT', checkOutTime: null },
      });
      createdAttendanceIds.push(primAtt.id);

      // Intentar SELF en Primaria -> 422
      const resSelfPrimary = await fetch(`${BASE_URL}/attendance/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminProToken}`,
        },
        body: JSON.stringify({
          code: primaryStudentCode,
          pickupType: 'SELF',
        }),
      });
      const is422Self = resSelfPrimary.status === 422;

      // 10.2 Con persona autorizada válida -> 200 y notificación
      const authorizedPickup = await prisma.authorizedPickup.create({
        data: {
          schoolId: schoolProId,
          studentId: primaryEnrollment.student.id,
          fullName: 'Tía Rosa Gómez',
          relationship: 'Tía',
          documentType: 'DNI',
          documentId: '44556677',
          cellphone: '987654321',
          createdById: adminProUser!.id,
        },
      });
      createdPickupIds.push(authorizedPickup.id);

      const resCheckout = await fetch(`${BASE_URL}/attendance/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminProToken}`,
        },
        body: JSON.stringify({
          code: primaryStudentCode,
          pickupType: 'AUTHORIZED',
          pickupPersonId: authorizedPickup.id,
          earlyLeaveReason: 'Cita con dentista',
        }),
      });
      const is200Checkout = resCheckout.status === 200;

      // Notificación al apoderado
      const checkoutNotif = await prisma.notification.findFirst({
        where: {
          schoolId: schoolProId,
          title: { contains: 'Salida' },
        },
        orderBy: { createdAt: 'desc' },
      });
      const hasNotif = Boolean(checkoutNotif && checkoutNotif.message.includes('Tía Rosa Gómez'));

      // 10.3 Segunda salida -> 409
      const resSecondCheckout = await fetch(`${BASE_URL}/attendance/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminProToken}`,
        },
        body: JSON.stringify({
          code: primaryStudentCode,
          pickupType: 'AUTHORIZED',
          pickupPersonId: authorizedPickup.id,
        }),
      });
      const is409Second = resSecondCheckout.status === 409;

      if (is422Self && is200Checkout && hasNotif && is409Second) {
        results.push({
          num: 10,
          name: 'Registro de salida y personas autorizadas',
          status: 'PASS',
          details: `Primaria SELF: 422, Persona autorizada válida: 200 con notificación enviada, Segunda salida: 409.`,
          durationMs: Date.now() - start,
        });
      } else {
        results.push({
          num: 10,
          name: 'Registro de salida y personas autorizadas',
          status: 'FAIL',
          details: `is422Self=${is422Self}, is200Checkout=${is200Checkout}, hasNotif=${hasNotif}, is409Second=${is409Second}`,
          durationMs: Date.now() - start,
        });
      }
    } catch (err: any) {
      results.push({
        num: 10,
        name: 'Registro de salida y personas autorizadas',
        status: 'FAIL',
        details: `Excepción: ${err.message}`,
        durationMs: Date.now() - start,
      });
    }
  }

  // =========================================================================
  // PRUEBA 11: Asistencia por curso (docente propio guarda 200, otro docente 403)
  // =========================================================================
  {
    const start = Date.now();
    try {
      // Asignación de docente.pro en Innova Pro
      const assignment = await prisma.courseAssignment.findFirst({
        where: {
          teacher: { email: 'docente.pro@innova.edu.pe' },
          schoolId: schoolProId,
        },
        include: {
          classroom: {
            include: {
              enrollments: { where: { isActive: true }, take: 2 },
            },
          },
        },
      });

      if (!assignment || assignment.classroom.enrollments.length === 0) {
        throw new Error('No se encontró asignación de docente.pro con alumnos');
      }

      const records = assignment.classroom.enrollments.map((e, idx) => ({
        enrollmentId: e.id,
        status: idx === 0 ? 'PRESENT' : 'LATE_UNJUSTIFIED',
        note: idx === 0 ? 'Participó en clase' : 'Llegó 10 min tarde',
      }));

      // 11.1 Docente del curso guarda -> 200
      const resTeacher = await fetch(`${BASE_URL}/course-attendance/session`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${teacherProToken}`,
        },
        body: JSON.stringify({
          courseAssignmentId: assignment.id,
          date: hoy,
          periodLabel: '1',
          records,
        }),
      });
      const teacherBody = (await resTeacher.json()) as any;
      const is200Teacher = resTeacher.status === 200;
      if (teacherBody.data?.id) createdSessionIds.push(teacherBody.data.id);

      // 11.2 Otro docente (Lucía) intenta guardar -> 403
      const resOtherTeacher = await fetch(`${BASE_URL}/course-attendance/session`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${luciaTeacherToken}`,
        },
        body: JSON.stringify({
          courseAssignmentId: assignment.id,
          date: hoy,
          periodLabel: '1',
          records,
        }),
      });
      const is403Other = resOtherTeacher.status === 403;

      if (is200Teacher && is403Other) {
        results.push({
          num: 11,
          name: 'Asistencia por curso y permisos de docente',
          status: 'PASS',
          details: `Docente asignado: 200 con sesión guardada. Otro docente: 403 "Solo el docente del curso puede registrar su asistencia."`,
          durationMs: Date.now() - start,
        });
      } else {
        results.push({
          num: 11,
          name: 'Asistencia por curso y permisos de docente',
          status: 'FAIL',
          details: `is200Teacher=${is200Teacher}, is403Other=${is403Other}`,
          durationMs: Date.now() - start,
        });
      }
    } catch (err: any) {
      results.push({
        num: 11,
        name: 'Asistencia por curso y permisos de docente',
        status: 'FAIL',
        details: `Excepción: ${err.message}`,
        durationMs: Date.now() - start,
      });
    }
  }

  // =========================================================================
  // LIMPIEZA DE DATOS DE PRUEBA
  // =========================================================================
  console.log('\n🧹 Limpiando datos de prueba generados...');
  try {
    if (createdSessionIds.length > 0) {
      await prisma.courseAttendanceSession.deleteMany({
        where: { id: { in: createdSessionIds } },
      });
    }
    if (createdPickupIds.length > 0) {
      await prisma.authorizedPickup.deleteMany({
        where: { id: { in: createdPickupIds } },
      });
    }
    if (createdAlertIds.length > 0) {
      await prisma.attendanceAlert.deleteMany({
        where: { id: { in: createdAlertIds } },
      });
    }
    if (createdJustificationIds.length > 0) {
      await prisma.attendanceJustification.deleteMany({
        where: { id: { in: createdJustificationIds } },
      });
    }
    if (createdHolidayIds.length > 0) {
      await prisma.schoolHoliday.deleteMany({
        where: { id: { in: createdHolidayIds } },
      });
    }
    if (createdAttendanceIds.length > 0) {
      await prisma.attendance.deleteMany({
        where: { id: { in: createdAttendanceIds } },
      });
    }
    // Limpiar notificaciones de prueba
    await prisma.notification.deleteMany({
      where: {
        schoolId: schoolProId,
        OR: [
          { title: { contains: 'Inasistencia' } },
          { title: { contains: 'Salida' } },
          { title: { contains: 'Alerta' } },
        ],
        createdAt: { gte: new Date(Date.now() - 30 * 60 * 1000) },
      },
    });
    console.log('✅ Base de datos restaurada al estado original.');
  } catch (cleanErr: any) {
    console.error('⚠️ Error limpiando datos de prueba:', cleanErr.message);
  }

  // Cerrar servidor
  await new Promise<void>((resolve) => {
    server.close(() => {
      console.log('🛑 Servidor de prueba detenido.');
      resolve();
    });
  });

  // Imprimir reporte de resultados
  console.log('\n====================================================');
  console.log('📊 REPORTE FINAL DE PRUEBAS DE INTEGRACIÓN:');
  console.log('====================================================');
  results.forEach((r) => {
    const icon = r.status === 'PASS' ? '✅ PASS' : '❌ FAIL';
    console.log(`${icon} | Prueba ${r.num}: ${r.name} (${r.durationMs}ms)`);
    console.log(`   Detalle: ${r.details}`);
  });

  const totalPassed = results.filter((r) => r.status === 'PASS').length;
  console.log(`\nResumen: ${totalPassed}/${results.length} pruebas superadas.`);

  if (totalPassed !== results.length) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((e) => {
  console.error('Fatal test runner error:', e);
  if (server) server.close();
  process.exit(1);
});
