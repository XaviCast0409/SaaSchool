import type { NotificationType } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { escapeHtml } from '../../utils/notification.util';
import { sendWebPushNotification } from '../../utils/web-push.util';
import { getSchoolNow } from '../../utils/timezone.util';
import { isInQuietHours } from './automation.rules';
import { enqueueEmail } from './email-queue';

/**
 * Entrega unificada de avisos automáticos, respetando las preferencias de cada persona:
 *  1. Siempre crea la notificación en la app (centro de notificaciones).
 *  2. Envía push si el tipo no está silenciado y no está en su horario de silencio.
 *  3. Envía correo (si el aviso lo incluye) si tiene correo y no lo silenció.
 * Todo es gratuito: push web (VAPID) y correo por Nodemailer con cola y tope diario.
 */

export interface Recipient {
  userId?: string | null;
  studentId?: string | null;
  email?: string | null;
}

export interface EmailContent {
  subject: string;
  heading: string;
  /** HTML ya escapado (usar escapeHtml en los datos variables). */
  bodyHtml: string;
  text: string;
  ctaLabel?: string;
}

export interface DeliveryMessage {
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
  email?: EmailContent;
  /** Avisos opcionales (p. ej. resumen semanal) que la persona puede desactivar. */
  respectWeeklyDigest?: boolean;
}

export interface DeliveryResult {
  inApp: number;
  push: number;
  email: number;
}

export function frontendUrl(): string {
  return (env.FRONTEND_URL || env.CORS_ORIGINS.split(',')[0] || '').trim().replace(/\/$/, '');
}

export function renderEmailHtml(schoolName: string, content: EmailContent, link?: string): string {
  const url = link ? `${frontendUrl()}${link}` : frontendUrl();
  const cta = content.ctaLabel
    ? `<p style="text-align:center;margin:28px 0;"><a href="${escapeHtml(url)}" style="background:#1e3a8a;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">${escapeHtml(content.ctaLabel)}</a></p>`
    : '';
  return `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff;">
    <p style="color:#64748b;font-size:12px;margin:0 0 4px;text-transform:uppercase;letter-spacing:.04em;">${escapeHtml(schoolName)}</p>
    <h2 style="color:#0f172a;margin:0 0 16px;font-size:20px;">${escapeHtml(content.heading)}</h2>
    <div style="color:#334155;font-size:14px;line-height:1.6;">${content.bodyHtml}</div>
    ${cta}
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
    <p style="color:#94a3b8;font-size:12px;text-align:center;margin:0;">
      Aviso automático de la plataforma escolar. Puede elegir qué avisos recibe desde
      <a href="${escapeHtml(frontendUrl())}/notification-preferences" style="color:#64748b;">Mis notificaciones</a>.
    </p>
  </div>`;
}

const keyOf = (r: Recipient) => (r.studentId ? `s:${r.studentId}` : `u:${r.userId}`);

export async function deliver(
  schoolId: string,
  recipients: Recipient[],
  msg: DeliveryMessage,
  context: { schoolName: string; nowTime?: string },
): Promise<DeliveryResult> {
  // Quitar duplicados y destinatarios vacíos
  const unique = new Map<string, Recipient>();
  for (const r of recipients) {
    if (!r.userId && !r.studentId) continue;
    const k = keyOf(r);
    if (!unique.has(k)) unique.set(k, r);
    else if (r.email && !unique.get(k)!.email) unique.get(k)!.email = r.email;
  }
  let list = [...unique.values()];
  if (list.length === 0) return { inApp: 0, push: 0, email: 0 };

  const userIds = list.filter((r) => !r.studentId).map((r) => r.userId!) as string[];
  const studentIds = list.filter((r) => r.studentId).map((r) => r.studentId!) as string[];

  const prefs = await prisma.notificationPreference.findMany({
    where: { schoolId, OR: [{ userId: { in: userIds } }, { studentId: { in: studentIds } }] },
  });
  const prefOf = new Map(prefs.map((p) => [p.studentId ? `s:${p.studentId}` : `u:${p.userId}`, p]));

  if (msg.respectWeeklyDigest) {
    list = list.filter((r) => prefOf.get(keyOf(r))?.weeklyDigest !== false);
    if (list.length === 0) return { inApp: 0, push: 0, email: 0 };
  }

  // 1. Notificación en la app
  await prisma.notification.createMany({
    data: list.map((r) => ({
      schoolId,
      userId: r.studentId ? null : r.userId!,
      studentId: r.studentId ?? null,
      title: msg.title.slice(0, 150),
      message: msg.message,
      type: msg.type,
      link: msg.link,
    })),
  });

  // 2. Push
  const nowTime = context.nowTime ?? (() => {
    const n = getSchoolNow();
    return `${String(n.hour).padStart(2, '0')}:${String(n.minute).padStart(2, '0')}`;
  })();
  const pushTargets = list.filter((r) => {
    const p = prefOf.get(keyOf(r));
    if (!p) return true;
    if (p.mutedPush.includes(msg.type)) return false;
    return !isInQuietHours(nowTime, p.quietFrom, p.quietTo);
  });
  let pushCount = 0;
  if (pushTargets.length > 0) {
    const subs = await prisma.pushSubscription.findMany({
      where: {
        schoolId,
        OR: [
          { userId: { in: pushTargets.filter((r) => !r.studentId).map((r) => r.userId!) } },
          { studentId: { in: pushTargets.filter((r) => r.studentId).map((r) => r.studentId!) } },
        ],
      },
    });
    for (const sub of subs) {
      const res = await sendWebPushNotification(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        { title: msg.title, message: msg.message, type: msg.type, link: msg.link },
      );
      if (res.success) pushCount++;
      if (res.shouldRemove) await prisma.pushSubscription.delete({ where: { endpoint: sub.endpoint } }).catch(() => undefined);
    }
  }

  // 3. Correo
  let emailCount = 0;
  if (msg.email) {
    const html = renderEmailHtml(context.schoolName, msg.email, msg.link);
    for (const r of list) {
      if (!r.email || !r.email.includes('@')) continue;
      const p = prefOf.get(keyOf(r));
      if (p?.mutedEmail.includes(msg.type)) continue;
      if (enqueueEmail({ to: r.email, subject: msg.email.subject, text: msg.email.text, html })) emailCount++;
    }
  }

  return { inApp: list.length, push: pushCount, email: emailCount };
}
