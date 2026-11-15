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

import { staffPair, isArchived, staffGroupOf } from '../messaging.rules';

describe('chat interno del personal', () => {
  it('A→B y B→A son la misma conversación', () => {
    expect(staffPair('b-id', 'a-id')).toEqual({ first: 'a-id', second: 'b-id', key: 'a-id:b-id' });
    expect(staffPair('a-id', 'b-id').key).toBe(staffPair('b-id', 'a-id').key);
  });

  it('archivada solo si no llegó nada después de archivarla', () => {
    const t = new Date('2026-11-15T10:00:00Z');
    expect(isArchived(null, t)).toBe(false);
    expect(isArchived(new Date('2026-11-15T11:00:00Z'), t)).toBe(true);
    expect(isArchived(new Date('2026-11-15T09:00:00Z'), t)).toBe(false);
  });

  it('agrupa por cargo', () => {
    expect(staffGroupOf('SCHOOL_ADMIN')).toBe('Dirección');
    expect(staffGroupOf('ADMINISTRATIVE')).toBe('Secretaría');
    expect(staffGroupOf('TEACHER')).toBe('Docentes');
  });
});
