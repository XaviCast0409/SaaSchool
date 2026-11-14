import { describe, it, expect } from 'vitest';
import { isSafeLink, normalizeRubric, normalizeTags } from '../teacher-resources.rules';

const full = { AD: 'Destaca', A: 'Logra', B: 'En proceso', C: 'En inicio' };

describe('rúbricas', () => {
  it('acepta criterios completos y limpia espacios', () => {
    const r = normalizeRubric([{ name: '  Organiza   ideas ', levels: full }]);
    expect('criteria' in r && r.criteria[0].name).toBe('Organiza ideas');
  });
  it('ignora filas vacías', () => {
    const r = normalizeRubric([{ name: 'Ortografía', levels: full }, { name: '', levels: {} }]);
    expect('criteria' in r && r.criteria).toHaveLength(1);
  });
  it('exige nombre, los cuatro niveles y nombres distintos', () => {
    expect(normalizeRubric([])).toEqual({ error: 'Agrega al menos un criterio.' });
    expect(normalizeRubric([{ name: '', levels: full }])).toEqual({ error: 'El criterio 1 no tiene nombre.' });
    expect(normalizeRubric([{ name: 'Coherencia', levels: { AD: 'x', A: 'y' } }])).toEqual({ error: '«Coherencia»: falta describir el nivel B, C.' });
    expect(normalizeRubric([{ name: 'A', levels: full }, { name: 'a', levels: full }])).toEqual({ error: 'Hay criterios con el mismo nombre.' });
  });
  it('limita la cantidad de criterios', () => {
    const many = Array.from({ length: 11 }, (_, i) => ({ name: `C${i}`, levels: full }));
    expect(normalizeRubric(many)).toEqual({ error: 'Máximo 10 criterios por rúbrica.' });
  });
});

describe('recursos', () => {
  it('normaliza etiquetas', () => {
    expect(normalizeTags(['#Fracciones', 'fracciones', ' Juego ', 'x'])).toEqual(['fracciones', 'juego']);
  });
  it('solo enlaces http(s)', () => {
    expect(isSafeLink('https://drive.google.com/file/d/1')).toBe(true);
    expect(isSafeLink('javascript:alert(1)')).toBe(false);
    expect(isSafeLink('no es un enlace')).toBe(false);
  });
});
