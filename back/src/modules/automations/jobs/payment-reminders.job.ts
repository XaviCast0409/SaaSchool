import { prisma } from '../../../config/prisma';
import { escapeHtml } from '../../../utils/notification.util';
import { remainingBalance } from '../../payments/payment.rules';
import { addDays, dateOnly, formatLongDate, formatMoney } from '../automation.rules';
import type { AutomationJob, JobContext, JobResult } from '../automation.types';
import { deliver } from '../delivery';
import { guardiansByStudent, studentShortName } from '../recipients';

type Mode = 'DUE_SOON' | 'OVERDUE';

/** Días respecto a hoy en que se avisa: 3 días antes y el mismo día; o 1 y 7 días después. */
const OFFSETS: Record<Mode, number[]> = { DUE_SOON: [3, 0], OVERDUE: [-1, -7] };

async function runPaymentReminders(ctx: JobContext, mode: Mode): Promise<JobResult> {
  const dates = OFFSETS[mode].map((d) => dateOnly(addDays(ctx.today, d)));
  const obligations = await prisma.paymentObligation.findMany({
    where: {
      schoolId: ctx.schoolId,
      status: { in: ['PENDING', 'PARTIAL'] },
      dueDate: { in: dates },
      enrollment: { isActive: true },
    },
    select: {
      id: true,
      title: true,
      amountDue: true,
      dueDate: true,
      transactions: { where: { status: 'ACTIVE' }, select: { amountPaid: true } },
      enrollment: { select: { student: { select: { id: true, firstNames: true, lastNamePaternal: true } } } },
    },
  });
  if (obligations.length === 0) return { items: 0, summary: 'Sin pensiones en las fechas de aviso.' };

  const guardians = await guardiansByStudent(
    [...new Set(obligations.map((o) => o.enrollment.student.id))],
    { financialOnly: true },
  );

  let notified = 0;
  for (const ob of obligations) {
    const student = ob.enrollment.student;
    const recipients = guardians.get(student.id) ?? [];
    if (recipients.length === 0) continue;

    const balance = remainingBalance(ob.amountDue, ob.transactions);
    if (balance <= 0) continue;
    const dueStr = ob.dueDate.toISOString().slice(0, 10);
    const name = studentShortName(student);
    const isToday = dueStr === ctx.today;
    const daysLate = Math.round((dateOnly(ctx.today).getTime() - ob.dueDate.getTime()) / 86_400_000);

    const title =
      mode === 'DUE_SOON'
        ? isToday
          ? `Hoy vence: ${ob.title}`
          : `Pensión por vencer: ${ob.title}`
        : `Pago pendiente: ${ob.title}`;
    const message =
      mode === 'DUE_SOON'
        ? `${isToday ? 'Hoy' : `El ${formatLongDate(dueStr)}`} vence "${ob.title}" de ${name}. Saldo: ${formatMoney(balance)}.`
        : `"${ob.title}" de ${name} venció hace ${daysLate} ${daysLate === 1 ? 'día' : 'días'}. Saldo: ${formatMoney(balance)}. Si ya pagó, por favor ignore este aviso.`;

    const bodyHtml =
      mode === 'DUE_SOON'
        ? `<p>Le recordamos que ${isToday ? '<strong>hoy</strong>' : `el <strong>${escapeHtml(formatLongDate(dueStr))}</strong>`} vence el siguiente concepto de <strong>${escapeHtml(name)}</strong>:</p>
           <p style="background:#f8fafc;border-left:4px solid #2563eb;padding:12px 16px;border-radius:6px;">
             <strong>${escapeHtml(ob.title)}</strong><br/>Saldo pendiente: <strong>${formatMoney(balance)}</strong>
           </p>
           <p>Puede pagar por los medios habituales del colegio. Si ya realizó el pago, por favor ignore este mensaje.</p>`
        : `<p>Queremos ayudarle a mantener su cuenta al día. El siguiente concepto de <strong>${escapeHtml(name)}</strong> figura pendiente:</p>
           <p style="background:#fff7ed;border-left:4px solid #f59e0b;padding:12px 16px;border-radius:6px;">
             <strong>${escapeHtml(ob.title)}</strong><br/>Venció el ${escapeHtml(formatLongDate(dueStr))} · Saldo: <strong>${formatMoney(balance)}</strong>
           </p>
           <p>Si tiene alguna dificultad, puede acercarse a la administración para coordinar. Si ya pagó, por favor ignore este mensaje.</p>`;

    await deliver(
      ctx.schoolId,
      recipients,
      {
        title,
        message,
        type: 'PAYMENT',
        link: '/payments',
        email: { subject: title, heading: title, bodyHtml, text: message, ctaLabel: 'Ver mis pagos' },
      },
      { schoolName: ctx.schoolName, nowTime: ctx.nowTime },
    );
    notified++;
  }

  return { items: notified, summary: `${notified} aviso(s) de ${obligations.length} pensión(es) revisada(s).` };
}

export const paymentDueSoonJob: AutomationJob = {
  name: 'payment-due-soon',
  label: 'Aviso de pensión por vencer',
  description: 'Recuerda a la familia 3 días antes y el mismo día del vencimiento, con el saldo pendiente.',
  audience: 'Familias',
  channels: 'App, push y correo',
  schedule: { time: '08:00' },
  scheduleLabel: 'Todos los días, 8:00 a. m.',
  defaultEnabled: true,
  minPlan: 'BASIC',
  run: (ctx) => runPaymentReminders(ctx, 'DUE_SOON'),
};

export const paymentOverdueJob: AutomationJob = {
  name: 'payment-overdue',
  label: 'Aviso amable de pensión vencida',
  description: 'Avisa 1 y 7 días después del vencimiento, en tono cordial y sin amenazas (Código del Consumidor).',
  audience: 'Familias',
  channels: 'App, push y correo',
  schedule: { time: '09:00', weekdays: [1, 2, 3, 4, 5, 6] },
  scheduleLabel: 'Lunes a sábado, 9:00 a. m.',
  defaultEnabled: true,
  minPlan: 'BASIC',
  run: (ctx) => runPaymentReminders(ctx, 'OVERDUE'),
};
