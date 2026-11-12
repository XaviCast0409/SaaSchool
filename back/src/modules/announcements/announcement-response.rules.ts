/**
 * Reglas puras de las respuestas a comunicados (confirmación, autorización, encuesta).
 */

export type ResponseType = 'NONE' | 'ACKNOWLEDGE' | 'AUTHORIZATION' | 'POLL';

export const AUTH_VALUES = ['AUTHORIZED', 'NOT_AUTHORIZED'] as const;

/** Valida que la respuesta corresponda al tipo de comunicado. Devuelve el mensaje de error o null. */
export function validateResponse(type: ResponseType, response: string, pollOptions: string[]): string | null {
  switch (type) {
    case 'NONE':
      return 'Este comunicado no requiere respuesta.';
    case 'ACKNOWLEDGE':
      return response === 'ACK' ? null : 'Respuesta no válida.';
    case 'AUTHORIZATION':
      return (AUTH_VALUES as readonly string[]).includes(response) ? null : 'Indica si autorizas o no.';
    case 'POLL':
      return pollOptions.includes(response) ? null : 'Elige una de las opciones de la encuesta.';
    default:
      return 'Respuesta no válida.';
  }
}

export interface ExpectedPair {
  userId: string;
  studentId: string;
}

/**
 * Resumen por alumno: se considera respondido si CUALQUIERA de sus apoderados respondió.
 * (Basta con que un apoderado autorice; si hay respuestas distintas, vale la más reciente.)
 */
export function summarizeByStudent(
  expected: ExpectedPair[],
  responses: Array<{ userId: string; studentId: string | null; response: string; respondedAt: Date }>,
): { expectedStudents: number; respondedStudents: number; tally: Record<string, number>; latestByStudent: Map<string, string> } {
  const students = new Set(expected.map((e) => e.studentId));
  const latest = new Map<string, { response: string; at: Date }>();
  for (const r of responses) {
    if (!r.studentId || !students.has(r.studentId)) continue;
    const prev = latest.get(r.studentId);
    if (!prev || r.respondedAt > prev.at) latest.set(r.studentId, { response: r.response, at: r.respondedAt });
  }
  const tally: Record<string, number> = {};
  for (const { response } of latest.values()) tally[response] = (tally[response] ?? 0) + 1;
  return {
    expectedStudents: students.size,
    respondedStudents: latest.size,
    tally,
    latestByStudent: new Map([...latest].map(([k, v]) => [k, v.response])),
  };
}

/** ¿Venció el plazo para responder? */
export function isPastDeadline(deadline: Date | null | undefined, now: Date = new Date()): boolean {
  return Boolean(deadline && now > deadline);
}
