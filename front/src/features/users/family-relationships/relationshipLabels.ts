/** Parentesco del apoderado en español (el backend guarda el código en inglés). */
export const RELATIONSHIP_LABELS: Record<string, string> = {
  MOTHER: 'Madre',
  FATHER: 'Padre',
  TUTOR_LEGAL: 'Tutor legal',
  GRANDPARENT: 'Abuelo/a',
  UNCLE_AUNT: 'Tío/a',
  OTHER: 'Apoderado',
};

export const relationshipLabel = (code?: string | null): string =>
  (code && RELATIONSHIP_LABELS[code]) || 'Apoderado';

/** Opciones para elegir el parentesco al vincular (el código genérico va al final) */
export const RELATIONSHIP_OPTIONS = [
  { value: 'MOTHER', label: 'Madre' },
  { value: 'FATHER', label: 'Padre' },
  { value: 'TUTOR_LEGAL', label: 'Tutor legal' },
  { value: 'GRANDPARENT', label: 'Abuelo/a' },
  { value: 'UNCLE_AUNT', label: 'Tío/a' },
  { value: 'OTHER', label: 'Otro familiar' },
] as const;
