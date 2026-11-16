import type { NotificationType } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { deliver, renderEmailHtml } from '../automations/delivery';
import { enqueueEmail, type EmailCategory } from '../automations/email-queue';
import { escapeHtml } from '../../utils/notification.util';

/**
 * Avisa a Dirección y Secretaría (en la app, push y correo según sus preferencias).
 * Nunca lanza: se llama con `void` desde rutas públicas y un rechazo sin manejar tumbaría el proceso.
 */
export async function notifySecretariat(
  schoolId: string,
  schoolName: string,
  msg: { title: string; message: string; link: string; type?: NotificationType },
): Promise<void> {
  try {
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
    );
  } catch (error) {
    console.error('[Secretaría] No se pudo avisar al personal:', error);
  }
}

const URL_PATTERN = /\b(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|net|org|info|xyz|top|ru|cn|io|co|me|ly|link|click|site|online|store|shop|biz|pe)(?:\/\S*)?/gi;

/**
 * Quita enlaces del texto que escribió un tercero antes de reenviarlo por correo: el texto libre de un
 * formulario público no debe poder usarse para mandar enlaces de spam o phishing desde el remitente del colegio.
 * (El registro completo queda intacto en la plataforma.)
 */
export const neutralizeLinks = (text: string): string => text.replace(URL_PATTERN, '[enlace omitido]');

/**
 * Correo directo a una persona sin cuenta (postulante o consumidor del Libro de Reclamaciones).
 * Tiene topes propios por colegio y por destinatario (ver email-queue).
 */
export function emailExternal(
  schoolId: string,
  to: string | null | undefined,
  schoolName: string,
  subject: string,
  heading: string,
  lines: string[],
  /** PUBLIC_FORM: disparado por un formulario público (topes estrictos). GENERAL: respuesta del personal. */
  category: EmailCategory = 'PUBLIC_FORM',
): void {
  if (!to) return;
  const bodyHtml = lines.map((l) => `<p>${escapeHtml(l)}</p>`).join('');
  void enqueueEmail(
    { to, subject: `${subject} · ${schoolName}`, text: lines.join('\n\n'), html: renderEmailHtml(schoolName, { subject, heading, bodyHtml, text: lines.join('\n') }) },
    { schoolId, category },
  );
}
