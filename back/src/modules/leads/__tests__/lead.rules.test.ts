import { describe, it, expect } from 'vitest';
import { normalizePeruPhone, scoreLead } from '../lead.rules';

describe('normalizePeruPhone', () => {
  it('acepta celulares con o sin prefijo 51 y con separadores', () => {
    expect(normalizePeruPhone('949 771 996')).toBe('949771996');
    expect(normalizePeruPhone('+51 949-771-996')).toBe('949771996');
  });

  it('rechaza números inválidos', () => {
    expect(normalizePeruPhone('12345')).toBeNull();
    expect(normalizePeruPhone('8497719961')).toBeNull();
  });
});

describe('scoreLead', () => {
  it('prioriza a quien decide en colegios medianos o grandes', () => {
    const director = scoreLead({ role: 'Directora', studentRange: '150-500', email: 'a@b.pe', message: 'Queremos dejar el Excel este año.' });
    const teacher = scoreLead({ role: 'Docente', studentRange: '<150' });
    expect(director).toBeGreaterThan(teacher);
    expect(director).toBeLessThanOrEqual(100);
  });
});
