import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import type { Classroom } from '@/features/classrooms/types';
import { formatClassroomLabel, sortClassrooms } from '@/lib/classroomLabel';
import { ClassroomSelect } from '../classroom-select';

describe('formatClassroomLabel', () => {
  it('formats classroom as [grade]° "[section]" — [Level]', () => {
    expect(formatClassroomLabel({ grade: 3, section: 'A', educationLevel: 'PRIMARY' })).toBe('3° "A" — Primaria');
  });
});

describe('sortClassrooms & ClassroomSelect', () => {
  afterEach(cleanup);

  const sampleClassrooms: Classroom[] = [
    { id: 'sec-1a', schoolId: 's1', grade: 1, section: 'A', educationLevel: 'SECONDARY', shift: 'MORNING', capacity: 30 },
    { id: 'pri-2b', schoolId: 's1', grade: 2, section: 'B', educationLevel: 'PRIMARY', shift: 'MORNING', capacity: 30 },
    { id: 'pri-2a', schoolId: 's1', grade: 2, section: 'A', educationLevel: 'PRIMARY', shift: 'MORNING', capacity: 30 },
    { id: 'ini-5a', schoolId: 's1', grade: 5, section: 'A', educationLevel: 'INITIAL', shift: 'MORNING', capacity: 30 },
  ];

  it('sorts classrooms by INITIAL < PRIMARY < SECONDARY, then grade asc, then section', () => {
    const sorted = sortClassrooms(sampleClassrooms);
    expect(sorted.map((c) => c.id)).toEqual(['ini-5a', 'pri-2a', 'pri-2b', 'sec-1a']);
  });

  it('renders sorted classroom options', () => {
    render(<ClassroomSelect classrooms={sampleClassrooms} value="" onChange={() => {}} />);
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    const optionTexts = Array.from(select.options).map((opt) => opt.text);
    expect(optionTexts).toEqual([
      '5° "A" — Inicial',
      '2° "A" — Primaria',
      '2° "B" — Primaria',
      '1° "A" — Secundaria',
    ]);
  });

  it('calls onChange with selected classroom id on change', () => {
    const handleChange = vi.fn();
    render(<ClassroomSelect classrooms={sampleClassrooms} value="pri-2a" onChange={handleChange} />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'sec-1a' } });
    expect(handleChange).toHaveBeenCalledWith('sec-1a');
  });

  it('renders allLabel option as first option with empty value', () => {
    render(
      <ClassroomSelect
        classrooms={sampleClassrooms}
        value=""
        onChange={() => {}}
        allLabel="Todas las aulas"
      />,
    );
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.options[0].value).toBe('');
    expect(select.options[0].text).toBe('Todas las aulas');
  });

  it('renders disabled placeholder option when placeholder is provided and allLabel is not', () => {
    render(
      <ClassroomSelect
        classrooms={sampleClassrooms}
        value=""
        onChange={() => {}}
        placeholder="Seleccionar aula"
      />,
    );
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.options[0].value).toBe('');
    expect(select.options[0].text).toBe('Seleccionar aula');
    expect(select.options[0].disabled).toBe(true);
  });
});
