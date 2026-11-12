/**
 * Reglas puras de la mensajería familia ↔ personal (sin base de datos), para poder probarlas.
 */

export const MAX_MESSAGE_LENGTH = 2000;

/**
 * ¿Está dentro del horario de atención del colegio? Lunes a viernes, entre start (incluido) y end (excluido).
 * Fuera de horario el mensaje se guarda igual, pero no se envía push al docente: lo verá al entrar.
 */
export function isWithinOfficeHours(nowTime: string, weekday: number, start: string, end: string): boolean {
  if (weekday === 0 || weekday === 6) return false;
  return nowTime >= start && nowTime < end;
}

/** Limpia el texto: recorta espacios y colapsa más de 2 saltos de línea seguidos. */
export function normalizeMessageBody(body: string): string {
  return body.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** Vista previa corta para la lista de conversaciones. */
export function previewOf(body: string, max = 80): string {
  const single = body.replace(/\s+/g, ' ').trim();
  return single.length > max ? `${single.slice(0, max - 1)}…` : single;
}

/**
 * Cantidad de mensajes no leídos: los del otro participante posteriores a mi última lectura.
 */
export function countUnread(
  messages: Array<{ senderId: string; createdAt: Date }>,
  myId: string,
  lastReadAt: Date | null,
): number {
  return messages.filter((m) => m.senderId !== myId && (!lastReadAt || m.createdAt > lastReadAt)).length;
}
