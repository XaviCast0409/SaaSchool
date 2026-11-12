import { describe, it, expect } from 'vitest';
import { isWithinOfficeHours, normalizeMessageBody, previewOf, countUnread } from '../messaging.rules';

describe('mensajería', () => {
  it('horario de atención: lunes a viernes entre inicio y fin', () => {
    expect(isWithinOfficeHours('07:00', 1, '07:00', '18:00')).toBe(true);
    expect(isWithinOfficeHours('18:00', 1, '07:00', '18:00')).toBe(false);
    expect(isWithinOfficeHours('10:00', 6, '07:00', '18:00')).toBe(false);
    expect(isWithinOfficeHours('10:00', 0, '07:00', '18:00')).toBe(false);
  });
  it('normaliza el texto', () => {
    expect(normalizeMessageBody('  hola\r\n\r\n\r\n\r\nprofe  ')).toBe('hola\n\nprofe');
  });
  it('vista previa corta', () => {
    expect(previewOf('a'.repeat(100), 10)).toHaveLength(10);
    expect(previewOf('hola   mundo')).toBe('hola mundo');
  });
  it('cuenta no leídos del otro participante', () => {
    const t = (iso: string) => new Date(iso);
    const msgs = [
      { senderId: 'yo', createdAt: t('2026-11-10T10:00:00Z') },
      { senderId: 'otro', createdAt: t('2026-11-10T11:00:00Z') },
      { senderId: 'otro', createdAt: t('2026-11-10T12:00:00Z') },
    ];
    expect(countUnread(msgs, 'yo', null)).toBe(2);
    expect(countUnread(msgs, 'yo', t('2026-11-10T11:30:00Z'))).toBe(1);
  });
});
