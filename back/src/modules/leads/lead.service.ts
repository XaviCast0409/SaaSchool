import type { Prisma, SalesLeadStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { AppError } from '../../core/errors/app-error';
import { enqueueEmail } from '../automations/email-queue';
import { renderEmailHtml } from '../automations/delivery';
import { escapeHtml } from '../../utils/notification.util';
import { LEAD_PLANS, LEAD_STATUSES, STUDENT_RANGES, normalizePeruPhone, scoreLead } from './lead.rules';

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().nullable().transform((value) => value || null);

export const createLeadSchema = z.object({
  contactName: z.string().trim().min(2, 'Escribe tu nombre.').max(100),
  role: z.string().trim().min(2, 'Indica tu cargo.').max(60),
  schoolName: z.string().trim().min(2, 'Escribe el nombre del colegio.').max(150),
  phone: z.string().trim().min(6, 'Escribe tu celular.').max(20),
  email: z.string().trim().email('Correo inválido.').max(150).optional().nullable().or(z.literal('')).transform((value) => value || null),
  city: optionalText(80),
  studentRange: z.enum(STUDENT_RANGES).optional().nullable().transform((value) => value ?? null),
  interestPlan: z.enum(LEAD_PLANS).optional().nullable().transform((value) => value ?? null),
  message: optionalText(1500),
  source: optionalText(80),
  consent: z.literal(true, { errorMap: () => ({ message: 'Debes aceptar el tratamiento de datos personales.' }) }),
  website: z.string().optional(), // campo trampa contra bots
});

export const updateLeadSchema = z.object({
  status: z.enum(LEAD_STATUSES).optional(),
  notes: z.string().trim().max(3000).nullable().optional(),
});

export type CreateLeadDto = z.infer<typeof createLeadSchema>;
export type UpdateLeadDto = z.infer<typeof updateLeadSchema>;

interface LeadSummary {
  contactName: string;
  schoolName: string;
  phone: string;
  role: string;
  studentRange: string | null;
  score: number;
}

export class LeadService {
  async create(dto: CreateLeadDto): Promise<{ id: string }> {
    const phone = normalizePeruPhone(dto.phone);
    if (!phone) throw new AppError('Escribe un número de celular válido (9 dígitos).', 400);

    const lead = await prisma.salesLead.create({
      data: {
        contactName: dto.contactName,
        role: dto.role,
        schoolName: dto.schoolName,
        phone,
        email: dto.email,
        city: dto.city,
        studentRange: dto.studentRange,
        interestPlan: dto.interestPlan,
        message: dto.message,
        source: dto.source,
        score: scoreLead(dto),
      },
      select: { id: true, contactName: true, schoolName: true, phone: true, role: true, studentRange: true, score: true },
    });

    void this.notifyPlatform(lead).catch((error) => console.error('[Leads] No se pudo avisar del nuevo lead:', error));
    return { id: lead.id };
  }

  async list(status?: SalesLeadStatus) {
    const where: Prisma.SalesLeadWhereInput = status ? { status } : {};
    const [leads, grouped] = await Promise.all([
      prisma.salesLead.findMany({ where, orderBy: { createdAt: 'desc' }, take: 500 }),
      prisma.salesLead.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);
    const counts = Object.fromEntries(LEAD_STATUSES.map((leadStatus) => [leadStatus, 0])) as Record<SalesLeadStatus, number>;
    for (const group of grouped) counts[group.status] = group._count._all;
    return { leads, counts };
  }

  async update(id: string, dto: UpdateLeadDto) {
    const existing = await prisma.salesLead.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new AppError('Lead no encontrado.', 404);
    return prisma.salesLead.update({ where: { id }, data: dto });
  }

  /** Correo a los administradores de la plataforma por cada lead nuevo. */
  private async notifyPlatform(lead: LeadSummary): Promise<void> {
    const admins = await prisma.user.findMany({ where: { role: 'SUPER_ADMIN', isActive: true }, select: { email: true } });
    const subject = `Nuevo lead: ${lead.schoolName}`;
    const lines = [
      `${lead.contactName} (${lead.role}) de ${lead.schoolName} pidió una demostración.`,
      `Celular: ${lead.phone}${lead.studentRange ? ` · Alumnos: ${lead.studentRange}` : ''} · Prioridad: ${lead.score}/100`,
    ];
    const bodyHtml = lines.map((line) => `<p>${escapeHtml(line)}</p>`).join('');
    for (const admin of admins) {
      if (!admin.email) continue;
      await enqueueEmail({
        to: admin.email,
        subject,
        text: lines.join('\n\n'),
        html: renderEmailHtml('KIPUX', { subject, heading: subject, bodyHtml, text: lines.join('\n'), ctaLabel: 'Ver leads' }, '/super-admin/leads'),
      });
    }
  }
}
