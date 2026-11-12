/**
 * Generación de archivos iCalendar (RFC 5545) para que las familias agreguen el calendario
 * escolar a Google Calendar, iPhone u Outlook. Sin dependencias externas.
 */

export interface IcsEvent {
  uid: string;
  title: string;
  description?: string | null;
  location?: string | null;
  /** 'YYYY-MM-DD' */
  date: string;
  /** 'YYYY-MM-DD' (inclusive); para eventos de varios días. */
  endDate?: string | null;
  /** 'HH:mm' hora de Lima. Sin hora = todo el día. */
  startTime?: string | null;
  endTime?: string | null;
}

/** Escapa texto según RFC 5545 (barra, punto y coma, coma y saltos de línea). */
export function escapeIcs(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** Pliega líneas de más de 75 octetos (continuación con un espacio al inicio). */
export function foldLine(line: string): string {
  const bytes = Buffer.from(line, 'utf8');
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let current = '';
  for (const ch of line) {
    if (Buffer.byteLength(current + ch, 'utf8') > (parts.length === 0 ? 75 : 74)) {
      parts.push(current);
      current = ch;
    } else {
      current += ch;
    }
  }
  if (current) parts.push(current);
  return parts.join('\r\n ');
}

const compactDate = (d: string) => d.replace(/-/g, '');
const compactTime = (t: string) => `${t.replace(':', '')}00`;

function nextDay(date: string): string {
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function buildIcs(calendarName: string, events: IcsEvent[], now: Date = new Date()): string {
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SaaSchool//Calendario escolar//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcs(calendarName)}`,
    'X-WR-TIMEZONE:America/Lima',
    'BEGIN:VTIMEZONE',
    'TZID:America/Lima',
    'BEGIN:STANDARD',
    'DTSTART:19700101T000000',
    'TZOFFSETFROM:-0500',
    'TZOFFSETTO:-0500',
    'TZNAME:-05',
    'END:STANDARD',
    'END:VTIMEZONE',
  ];
  for (const e of events) {
    lines.push('BEGIN:VEVENT', `UID:${e.uid}`, `DTSTAMP:${stamp}`, `SUMMARY:${escapeIcs(e.title)}`);
    if (e.startTime) {
      lines.push(`DTSTART;TZID=America/Lima:${compactDate(e.date)}T${compactTime(e.startTime)}`);
      const endTime = e.endTime && e.endTime > e.startTime ? e.endTime : e.startTime;
      lines.push(`DTEND;TZID=America/Lima:${compactDate(e.endDate ?? e.date)}T${compactTime(endTime)}`);
    } else {
      // Todo el día: DTEND es exclusivo (día siguiente al último)
      lines.push(`DTSTART;VALUE=DATE:${compactDate(e.date)}`, `DTEND;VALUE=DATE:${compactDate(nextDay(e.endDate ?? e.date))}`);
    }
    if (e.description) lines.push(`DESCRIPTION:${escapeIcs(e.description)}`);
    if (e.location) lines.push(`LOCATION:${escapeIcs(e.location)}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}
