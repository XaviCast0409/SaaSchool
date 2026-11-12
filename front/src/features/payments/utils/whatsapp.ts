import { formatPeruShortDate } from '@/lib/dateUtils';
import type { PaymentObligation } from '../types';

/**
 * Recordatorios por WhatsApp sin API pagada: se arma un enlace wa.me con el mensaje ya escrito
 * y la persona solo pulsa "Enviar" en WhatsApp Web o en su celular.
 */

export const DEFAULT_WA_TEMPLATE =
  'Estimado(a) {apoderado}, le saludamos de {colegio}. Le recordamos que "{concepto}" de {alumno} venció el {vencimiento}. Saldo pendiente: S/ {saldo}. Si ya realizó el pago, por favor ignore este mensaje. ¡Gracias!';

export const TEMPLATE_VARIABLES = ['{apoderado}', '{alumno}', '{concepto}', '{vencimiento}', '{saldo}', '{colegio}'];

/** Deja solo dígitos y agrega el prefijo del país si el número es local (9 dígitos en Perú). */
export function normalizePhone(raw: string | null | undefined, countryCode = '51'): string | null {
  const digits = (raw ?? '').replace(/\D/g, '');
  if (digits.length < 7) return null;
  if (digits.startsWith(countryCode) && digits.length > 9) return digits;
  return `${countryCode}${digits.replace(/^0+/, '')}`;
}

/** Saldo pendiente en soles (los montos llegan como texto desde la API: Decimal). */
export function remainingOf(o: Pick<PaymentObligation, 'amountDue' | 'transactions'>): number {
  const cents = (v: unknown) => Math.round(Number(v ?? 0) * 100);
  const paid = (o.transactions ?? []).reduce((s, t) => s + cents(t.amountPaid), 0);
  return Math.max(0, cents(o.amountDue) - paid) / 100;
}

/** Apoderado a contactar: el responsable de pagos si está marcado; si no, el primero con celular. */
export function pickContact(o: PaymentObligation) {
  const relations = (o.enrollment?.student?.familyRelations ?? []) as Array<{
    isFinancialResponsible?: boolean;
    user?: { firstName: string; lastNamePaternal: string; cellphone?: string };
  }>;
  const withPhone = relations.filter((r) => r.user?.cellphone);
  return (withPhone.find((r) => r.isFinancialResponsible) ?? withPhone[0])?.user ?? null;
}

export function fillTemplate(template: string, o: PaymentObligation, schoolName: string): string {
  const parent = pickContact(o);
  const student = o.enrollment?.student;
  const values: Record<string, string> = {
    '{apoderado}': parent ? `${parent.firstName} ${parent.lastNamePaternal}`.trim() : 'apoderado(a)',
    '{alumno}': student ? `${student.firstNames.split(' ')[0]} ${student.lastNamePaternal}` : 'su hijo(a)',
    '{concepto}': o.title,
    '{vencimiento}': formatPeruShortDate(o.dueDate),
    '{saldo}': remainingOf(o).toFixed(2),
    '{colegio}': schoolName || 'el colegio',
  };
  return Object.entries(values).reduce((text, [k, v]) => text.split(k).join(v), template);
}

export function buildWhatsAppLink(o: PaymentObligation, template: string, schoolName: string, countryCode = '51'): string | null {
  const phone = normalizePhone(pickContact(o)?.cellphone, countryCode);
  if (!phone) return null;
  return `https://wa.me/${phone}?text=${encodeURIComponent(fillTemplate(template, o, schoolName))}`;
}
