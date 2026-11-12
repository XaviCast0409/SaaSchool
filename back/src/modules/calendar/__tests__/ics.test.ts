import { describe, it, expect } from 'vitest';
import { buildIcs, escapeIcs, foldLine } from '../ics';

describe('iCalendar', () => {
  it('escapa caracteres especiales', () => {
    expect(escapeIcs('Reunión; padres, 3.° A\nTraer DNI')).toBe('Reunión\\; padres\\, 3.° A\\nTraer DNI');
  });

  it('pliega líneas largas a 75 octetos', () => {
    const folded = foldLine(`SUMMARY:${'á'.repeat(60)}`);
    for (const part of folded.split('\r\n')) expect(Buffer.byteLength(part, 'utf8')).toBeLessThanOrEqual(75);
    expect(folded.split('\r\n').slice(1).every((p) => p.startsWith(' '))).toBe(true);
  });

  it('evento de todo el día usa DTEND exclusivo', () => {
    const ics = buildIcs('Colegio', [{ uid: 'e1@x', title: 'Día del Logro', date: '2026-11-20' }], new Date('2026-11-11T00:00:00Z'));
    expect(ics).toContain('DTSTART;VALUE=DATE:20261120');
    expect(ics).toContain('DTEND;VALUE=DATE:20261121');
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
  });

  it('evento con hora usa la zona horaria de Lima', () => {
    const ics = buildIcs('Colegio', [{ uid: 'e2@x', title: 'Reunión', date: '2026-11-18', startTime: '18:30', endTime: '20:00', location: 'Auditorio' }]);
    expect(ics).toContain('DTSTART;TZID=America/Lima:20261118T183000');
    expect(ics).toContain('DTEND;TZID=America/Lima:20261118T200000');
    expect(ics).toContain('LOCATION:Auditorio');
  });

  it('evento de varios días', () => {
    const ics = buildIcs('Colegio', [{ uid: 'e3@x', title: 'Vacaciones', date: '2026-07-27', endDate: '2026-08-07' }]);
    expect(ics).toContain('DTEND;VALUE=DATE:20260808');
  });
});
