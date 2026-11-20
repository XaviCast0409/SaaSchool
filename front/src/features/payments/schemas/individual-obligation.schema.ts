import { z } from 'zod';

export const createIndividualObligationSchema = z
  .object({
    studentId: z.string().min(1, 'Selecciona un estudiante'),
    concept: z.string().min(1, 'El concepto es obligatorio'),
    title: z.string().min(3, 'El título debe tener al menos 3 caracteres'),
    amountDue: z.coerce.number().positive('El monto debe ser mayor a 0'),
    dueDate: z.string().min(1, 'La fecha de vencimiento es obligatoria'),
    notes: z.string().optional(),
    paidNow: z.boolean().default(true),
    paymentMethod: z.enum(['CASH', 'YAPE', 'PLIN', 'BANK_TRANSFER', 'DEPOSIT', 'CREDIT_CARD']).default('CASH'),
    operationNumber: z.string().trim().optional(),
  })
  .refine((d) => !d.paidNow || d.paymentMethod === 'CASH' || Boolean(d.operationNumber), {
    message: 'Ingresa el número de operación.',
    path: ['operationNumber'],
  });

export type CreateIndividualObligationFormData = z.infer<typeof createIndividualObligationSchema>;

export const OBLIGATION_CONCEPT_OPTIONS = [
  { value: 'OTROS', label: 'Otros Conceptos (Constancias, Certificados, etc.)' },
  { value: 'MATRICULA', label: 'Matrícula Anual' },
  { value: 'PENSION', label: 'Pensión de Enseñanza' },
  { value: 'LIBROS_MATERIALES', label: 'Libros y Materiales Educativos' },
  { value: 'UNIFORME', label: 'Uniforme Escolar' },
  { value: 'CARNET_AGENDA', label: 'Carnet / Agenda Escolar' },
  { value: 'CUOTA_INGRESO', label: 'Cuota de Ingreso' },
  { value: 'EXCURSION_EVENTO', label: 'Excursión / Evento Extracurricular' },
];
