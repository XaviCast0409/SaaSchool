import { z } from 'zod';
import { isValidSlug, normalizeSlug, SLUG_INVALID_MESSAGE } from './school-slug.rules';
import { PASSWORD_POLICY_MESSAGE, PASSWORD_POLICY_REGEX } from '../../utils/password.util';

const emptyToUndefined = z.literal('').transform(() => undefined);

/** Código del colegio para su página de ingreso; vacío al crear = se genera desde el nombre. */
const slugField = z.string().transform(normalizeSlug).refine(isValidSlug, SLUG_INVALID_MESSAGE);

/** Texto opcional de la página de ingreso: vacío = se borra. */
const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} no puede superar ${max} caracteres`)
    .transform((v) => v || null)
    .nullable()
    .optional();

export const createSchoolSchema = z.object({
  name: z.string().min(3, 'El nombre del colegio es requerido'),
  documentId: z.string().regex(/^\d{11}$/, 'El RUC debe tener 11 dígitos numéricos'),
  modularCode: z
    .string()
    .regex(/^\d{7}$/, 'El código modular debe tener 7 dígitos numéricos')
    .optional()
    .nullable()
    .or(emptyToUndefined),
  localCode: z.string().optional().nullable().or(emptyToUndefined),
  email: z.string().email('Email institucional inválido').optional().nullable().or(emptyToUndefined),
  phone: z
    .string()
    .regex(/^(\+?51)?\s?9\d{8}$|^0\d{1,2}\d{6,7}$/, 'Número telefónico o celular peruano inválido')
    .optional()
    .nullable()
    .or(emptyToUndefined),
  address: z.string().optional().nullable().or(emptyToUndefined),
  logoUrl: z.string().url('URL del logo inválida').optional().nullable().or(emptyToUndefined),
  department: z.string().optional().nullable().or(emptyToUndefined),
  province: z.string().optional().nullable().or(emptyToUndefined),
  district: z.string().optional().nullable().or(emptyToUndefined),
  plan: z.enum(['BASIC', 'PRO', 'ENTERPRISE']).optional(),
  planExpiresAt: z.string().optional().nullable().or(emptyToUndefined),
  // Mensualidad pactada en soles; null = precio de lista del plan
  monthlyFee: z.number().min(0, 'La mensualidad no puede ser negativa').max(100000).nullable().optional(),
  slug: slugField.optional().or(emptyToUndefined),
  // Datos opcionales para crear el usuario Administrador Inicial en el onboarding
  adminEmail: z.string().email('Email de administrador inválido').optional().nullable().or(emptyToUndefined),
  // Misma regla que el resto de cuentas: antes se aceptaba aquí una clave débil y luego se reemplazaba en silencio
  adminPassword: z
    .string()
    .trim()
    .regex(PASSWORD_POLICY_REGEX, PASSWORD_POLICY_MESSAGE)
    .optional()
    .nullable()
    .or(emptyToUndefined),
  adminFirstName: z.string().optional().nullable().or(emptyToUndefined),
  adminLastNamePaternal: z.string().optional().nullable().or(emptyToUndefined),
  adminLastNameMaternal: z.string().optional().nullable().or(emptyToUndefined),
  adminDocumentId: z
    .string()
    .regex(/^\d{8}$/, 'El DNI del director debe tener 8 dígitos numéricos')
    .optional()
    .nullable()
    .or(emptyToUndefined),
  adminCellphone: z.string().optional().nullable().or(emptyToUndefined),
});

/**
 * Schema de actualización: excluye los campos de onboarding del administrador y
 * relaja la validación del teléfono para aceptar números ya guardados en cualquier
 * formato válido (con/sin código de país, con/sin espacios).
 */
export const updateSchoolSchema = createSchoolSchema
  .omit({
    adminEmail: true,
    adminPassword: true,
    adminFirstName: true,
    adminLastNamePaternal: true,
    adminLastNameMaternal: true,
    adminDocumentId: true,
    adminCellphone: true,
  })
  .extend({
    // En actualización, phone acepta cualquier formato de 6-20 caracteres (más permisivo)
    phone: z
      .string()
      .min(6, 'El teléfono debe tener al menos 6 dígitos')
      .max(20, 'El teléfono no puede exceder 20 caracteres')
      .optional()
      .nullable()
      .or(emptyToUndefined),
    offeredLevels: z
      .array(z.enum(['INITIAL', 'PRIMARY', 'SECONDARY']))
      .min(1, 'El colegio debe operar al menos un nivel educativo')
      .optional(),
    blockCertificatesOnOverdue: z.boolean().optional(),
    brandColor: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, 'Color inválido (formato #RRGGBB)')
      .nullable()
      .optional(),
    notifyAbsencesToFamilies: z.boolean().optional(),
    absenceAlertConsecutive: z.number().int().min(2).max(10).optional(),
    absenceAlertMonthlyPercent: z.number().int().min(5).max(50).optional(),
    lateAlertMonthlyCount: z.number().int().min(2).max(20).optional(),
    messagingEnabled: z.boolean().optional(),
    messagingStartTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora inválida (HH:mm)').optional(),
    messagingEndTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora inválida (HH:mm)').optional(),
    whatsappCountryCode: z.string().regex(/^\d{1,4}$/, 'Prefijo inválido (solo números, p. ej. 51)').optional(),
    // Página de ingreso del colegio
    loginBackgroundUrl: z
      .string()
      .regex(/^\/api\/files\/[0-9a-f-]{36}$/i, 'Imagen de fondo inválida')
      .nullable()
      .optional(),
    loginTitle: optionalText(80, 'El título'),
    loginMessage: optionalText(500, 'El mensaje'),
  })
  .partial()
  .refine((v) => !v.messagingStartTime || !v.messagingEndTime || v.messagingStartTime < v.messagingEndTime, {
    message: 'El fin del horario de atención debe ser posterior al inicio.',
    path: ['messagingEndTime'],
  });

export type CreateSchoolDto = z.infer<typeof createSchoolSchema>;
export type UpdateSchoolDto = z.infer<typeof updateSchoolSchema>;
