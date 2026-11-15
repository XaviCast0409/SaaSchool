import { z } from 'zod';

/** Los campos de un formulario multipart llegan como texto. */
const booleanField = z.preprocess((value) => value === true || value === 'true' || value === '1', z.boolean());

export const commitImportSchema = z.object({
  /** Generar el cronograma de cuotas del tarifario para cada matrícula nueva. Apagado por defecto. */
  generateFees: booleanField.default(false),
});

export type CommitImportDto = z.infer<typeof commitImportSchema>;
