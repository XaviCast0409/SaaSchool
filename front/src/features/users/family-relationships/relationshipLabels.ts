/** Parentesco del apoderado en español (el backend guarda el código en inglés). */
export const RELATIONSHIP_LABELS: Record<string, string> = {
  MOTHER: 'Madre',
  FATHER: 'Padre',
  GRANDPARENT: 'Abuelo/a',
  UNCLE_AUNT: 'Tío/a',
  OTHER: 'Apoderado',
};

export const relationshipLabel = (code?: string | null): string =>
  (code && RELATIONSHIP_LABELS[code]) || 'Apoderado';
