import type { NotificationType } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { deliver, renderEmailHtml } from '../automations/delivery';
import { enqueueEmail } from '../automations/email-queue';
import { escapeHtml } from '../../utils/notification.util';

/** Avisa a Dirección y Secretaría (en la app, push y correo según sus preferencias). */
export async function notifySecretariat(
  schoolId: string,
  schoolName: string,
  msg: { title: string; message: string; link: string; type?: NotificationType },
) {
  const staff = await prisma.user.findMany({
    where: { schoolId, isActive: true, role: { in: ['SCHOOL_ADMIN', 'ADMINISTRATIVE'] } },
    select: { id: true, email: true },
  });
  if (!staff.length) return;
  await deliver(
    schoolId,
    staff.map((u) => ({ userId: u.id, email: u.email })),
    {
      title: msg.title,
      message: msg.message,
      type: msg.type ?? 'GENERAL',
      link: msg.link,
      email: { subject: msg.title, heading: msg.title, bodyHtml: `<p>${escapeHtml(msg.message)}</p>`, text: msg.message, ctaLabel: 'Abrir en la plataforma' },
    },
    { schoolName },
  ).catch((e) => console.error('[Secretaría] No se pudo avisar al personal:', e));
}

/** Correo directo a una persona sin cuenta (postulante o consumidor del Libro de Reclamaciones). */
export function emailExternal(to: string | null | undefined, schoolName: string, subject: string, heading: string, lines: string[]) {
  if (!to) return;
  const bodyHtml = lines.map((l) => `<p>${escapeHtml(l)}</p>`).join('');
  enqueueEmail({ to, subject: `${subject} · ${schoolName}`, text: lines.join('\n\n'), html: renderEmailHtml(schoolName, { subject, heading, bodyHtml, text: lines.join('\n') }) });
}
