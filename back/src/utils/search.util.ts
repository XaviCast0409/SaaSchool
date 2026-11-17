/**
 * Búsqueda de personas por varias palabras: "garcía ana" o "lópez 7123" encuentran a la persona
 * aunque cada palabra esté en un campo distinto (nombres, apellidos, DNI...).
 *
 * Devuelve una lista para meter en un `AND` de Prisma: cada palabra debe aparecer en alguno de los campos.
 * Sin texto (o solo espacios) devuelve una lista vacía.
 */
export function splitSearchTerms(search?: string | null, maxTerms = 5): string[] {
  if (!search) return [];
  return search
    .trim()
    .split(/[\s,]+/)
    .map((term) => term.trim())
    .filter(Boolean)
    .slice(0, maxTerms);
}

/** Campos de texto en los que se busca sin distinguir mayúsculas; `exact` sin modo (p. ej. documentos y códigos). */
export interface SearchFields<W> {
  insensitive: Array<keyof W & string>;
  exact?: Array<keyof W & string>;
}

export function multiWordSearch<W extends Record<string, unknown>>(search: string | null | undefined, fields: SearchFields<W>): W[] {
  return splitSearchTerms(search).map(
    (term) =>
      ({
        OR: [
          ...fields.insensitive.map((field) => ({ [field]: { contains: term, mode: 'insensitive' } })),
          ...(fields.exact ?? []).map((field) => ({ [field]: { contains: term } })),
        ],
      }) as unknown as W,
  );
}
