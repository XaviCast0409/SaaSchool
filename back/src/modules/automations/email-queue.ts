import type { EmailOutbox } from '@prisma/client';
import { env } from '../../config/env';
import { prisma } from '../../config/prisma';
import { sendEmail, type EmailOptions } from '../../utils/notification.util';
import { getSchoolNow } from '../../utils/timezone.util';

/**
 * Cola de correos PERSISTENTE (tabla EmailOutbox): envía de uno en uno con pausa entre envíos y
 * con tope diario, para no superar el límite de Gmail (~500 destinatarios al día) ni ser marcado como spam.
 *
 * - Sobrevive a reinicios y despliegues: los pendientes se retoman al arrancar (resumeEmailQueue).
 * - El tope diario se cuenta en la BD, así que reiniciar el servidor no lo "resetea".
 * - Los formularios públicos (categoría PUBLIC_FORM) pueden tener además un tope por colegio, una cuota
 *   máxima del total y un tope por destinatario (solo si PUBLIC_FORM_DAILY_LIMIT_PER_SCHOOL está definida),
 *   para que el abuso de un formulario no deje a los demás colegios sin avisos.
 * Si se alcanza un tope, el correo se descarta (la notificación en la app y el push sí llegan).
 */
const GAP_MS = 1500;
const MAX_ATTEMPTS = 3;
/** Fracción del tope diario global que pueden consumir, entre todos, los formularios públicos. */
const PUBLIC_FORM_GLOBAL_SHARE = 0.4;
/** Correos de formularios públicos que puede recibir una misma dirección al día. */
const PUBLIC_FORM_PER_RECIPIENT = 3;
const RETENTION_DAYS = 30;

export type EmailCategory = 'GENERAL' | 'PUBLIC_FORM';

export interface EnqueueOptions {
  schoolId?: string | null;
  category?: EmailCategory;
}

let processing = false;

/** Inicio del día escolar (America/Lima, UTC-5 sin horario de verano). */
const startOfSchoolDay = (): Date => new Date(`${getSchoolNow().dateStr}T00:00:00.000-05:00`);

const ACTIVE_STATUSES = ['PENDING', 'SENDING', 'SENT'];

/** Explica por qué se rechaza el correo, o null si entra en los topes. */
async function rejectionReason(options: EmailOptions, opts: EnqueueOptions): Promise<string | null> {
  const since = startOfSchoolDay();
  const usedToday = await prisma.emailOutbox.count({
    where: { createdAt: { gte: since }, status: { in: ACTIVE_STATUSES } },
  });
  if (usedToday >= env.MAIL_DAILY_LIMIT) return `tope diario global de ${env.MAIL_DAILY_LIMIT} correos`;

  // Topes de formularios públicos: APAGADOS mientras no se defina PUBLIC_FORM_DAILY_LIMIT_PER_SCHOOL
  // (hoy hay un solo colegio). Activarlos al sumar colegios o al subir de plan de correo.
  if (opts.category === 'PUBLIC_FORM' && env.PUBLIC_FORM_DAILY_LIMIT_PER_SCHOOL) {
    const [bySchool, allPublic, byRecipient] = await Promise.all([
      prisma.emailOutbox.count({
        where: { schoolId: opts.schoolId ?? null, category: 'PUBLIC_FORM', createdAt: { gte: since }, status: { in: ACTIVE_STATUSES } },
      }),
      prisma.emailOutbox.count({
        where: { category: 'PUBLIC_FORM', createdAt: { gte: since }, status: { in: ACTIVE_STATUSES } },
      }),
      prisma.emailOutbox.count({
        where: { to: options.to.toLowerCase(), category: 'PUBLIC_FORM', createdAt: { gte: since } },
      }),
    ]);
    if (bySchool >= env.PUBLIC_FORM_DAILY_LIMIT_PER_SCHOOL) return 'tope diario de formularios públicos del colegio';
    if (allPublic >= Math.floor(env.MAIL_DAILY_LIMIT * PUBLIC_FORM_GLOBAL_SHARE)) return 'cuota diaria de formularios públicos';
    if (byRecipient >= PUBLIC_FORM_PER_RECIPIENT) return 'tope diario por destinatario';
  }
  return null;
}

/** Encola un correo. Devuelve false si se descartó por algún tope o si no se pudo guardar. Nunca lanza. */
export async function enqueueEmail(options: EmailOptions, opts: EnqueueOptions = {}): Promise<boolean> {
  try {
    const reason = await rejectionReason(options, opts);
    if (reason) {
      console.warn(`[EmailQueue] Correo omitido (${reason}).`);
      return false;
    }
    await prisma.emailOutbox.create({
      data: {
        schoolId: opts.schoolId ?? null,
        category: opts.category ?? 'GENERAL',
        to: options.to.toLowerCase(),
        subject: options.subject.slice(0, 300),
        text: options.text,
        html: options.html ?? null,
      },
    });
    void processQueue();
    return true;
  } catch (error) {
    console.error('[EmailQueue] No se pudo encolar el correo:', error);
    return false;
  }
}

/** Toma el siguiente pendiente de forma atómica (evita doble envío si hubiera dos instancias). */
async function claimNext(): Promise<EmailOutbox | null> {
  const next = await prisma.emailOutbox.findFirst({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
  });
  if (!next) return null;
  const claimed = await prisma.emailOutbox.updateMany({
    where: { id: next.id, status: 'PENDING' },
    data: { status: 'SENDING', attempts: { increment: 1 } },
  });
  return claimed.count === 1 ? { ...next, attempts: next.attempts + 1 } : claimNext();
}

async function processQueue(): Promise<void> {
  if (processing) return;
  processing = true;
  try {
    for (;;) {
      const next = await claimNext();
      if (!next) break;
      let ok = false;
      let lastError: string | null = null;
      try {
        ok = await sendEmail({ to: next.to, subject: next.subject, text: next.text, html: next.html ?? undefined });
        if (!ok) lastError = 'El servidor de correo rechazó el envío';
      } catch (error) {
        lastError = error instanceof Error ? error.message.slice(0, 500) : 'Error desconocido';
      }
      await prisma.emailOutbox.update({
        where: { id: next.id },
        data: ok
          ? { status: 'SENT', sentAt: new Date(), lastError: null, html: null }
          : { status: next.attempts >= MAX_ATTEMPTS ? 'FAILED' : 'PENDING', lastError },
      });
      await new Promise((r) => setTimeout(r, GAP_MS));
    }
  } catch (error) {
    console.error('[EmailQueue] Error procesando la cola:', error);
  } finally {
    processing = false;
  }
}

/**
 * Al arrancar: devuelve a PENDING los que quedaron "enviándose" por un reinicio, borra los
 * registros viejos (contienen datos personales) y retoma la cola.
 */
export async function resumeEmailQueue(): Promise<void> {
  try {
    await prisma.emailOutbox.updateMany({ where: { status: 'SENDING' }, data: { status: 'PENDING' } });
    await prisma.emailOutbox.deleteMany({
      where: { createdAt: { lt: new Date(Date.now() - RETENTION_DAYS * 86_400_000) } },
    });
    void processQueue();
  } catch (error) {
    console.error('[EmailQueue] No se pudo retomar la cola:', error);
  }
}

export async function emailQueueStats() {
  const since = startOfSchoolDay();
  const [pending, sentToday, failedToday] = await Promise.all([
    prisma.emailOutbox.count({ where: { status: { in: ['PENDING', 'SENDING'] } } }),
    prisma.emailOutbox.count({ where: { status: 'SENT', sentAt: { gte: since } } }),
    prisma.emailOutbox.count({ where: { status: 'FAILED', createdAt: { gte: since } } }),
  ]);
  return { pending, sentToday, failedToday, dailyLimit: env.MAIL_DAILY_LIMIT };
}
