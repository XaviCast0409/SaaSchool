import { describe, it, expect } from 'vitest';
import { formatFullName } from '../name.util';

describe('M2: formatFullName', () => {
  it('omite limpiamente el apellido materno si es null o vacío', () => {
    const person = {
      firstName: 'Juan',
      lastNamePaternal: 'Quispe',
      lastNameMaternal: null,
    };
    expect(formatFullName(person, 'LAST_FIRST')).toBe('Quispe, Juan');
    expect(formatFullName(person, 'FIRST_LAST')).toBe('Juan Quispe');
  });

  it('formatea correctamente con ambos apellidos', () => {
    const person = {
      firstNames: 'María Elena',
      lastNamePaternal: 'Flores',
      lastNameMaternal: 'Rosas',
    };
    expect(formatFullName(person, 'LAST_FIRST')).toBe('Flores Rosas, María Elena');
    expect(formatFullName(person, 'FIRST_LAST')).toBe('María Elena Flores Rosas');
  });

  it('evita comas huérfanas si no hay apellidos o no hay nombre', () => {
    expect(formatFullName({ lastNamePaternal: 'Smith' }, 'LAST_FIRST')).toBe('Smith');
    expect(formatFullName({ firstName: 'Alex' }, 'LAST_FIRST')).toBe('Alex');
  });
});

