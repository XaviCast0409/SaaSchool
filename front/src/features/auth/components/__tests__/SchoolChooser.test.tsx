import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SchoolChooser, schoolOptionsFromError, type SchoolOption } from '../SchoolChooser';

const options: SchoolOption[] = [
  {
    schoolId: 's1',
    schoolName: 'Innova Academy',
    schoolSlug: 'innova',
    logoUrl: null,
    accountType: 'USER',
    role: 'PARENT',
    name: 'Ana',
  },
  {
    schoolId: 's2',
    schoolName: 'Colegio Santa Elena',
    schoolSlug: null,
    logoUrl: null,
    accountType: 'USER',
    role: 'PARENT',
    name: 'Ana',
  },
];

describe('selector de colegio (apoderado con cuentas en varios colegios)', () => {
  afterEach(() => cleanup());

  it('lee las opciones solo de un error SELECT_SCHOOL', () => {
    expect(
      schoolOptionsFromError({ response: { data: { code: 'SELECT_SCHOOL', details: { options } } } }),
    ).toHaveLength(2);
    expect(schoolOptionsFromError({ response: { data: { code: 'MFA_REQUIRED' } } })).toBeNull();
    expect(schoolOptionsFromError(new Error('red'))).toBeNull();
    expect(schoolOptionsFromError(null)).toBeNull();
  });

  it('muestra cada colegio con el rol y avisa cuál se eligió', () => {
    const onPick = vi.fn();
    const onCancel = vi.fn();
    render(<SchoolChooser options={options} onPick={onPick} onCancel={onCancel} />);
    expect(screen.getByText('Innova Academy')).toBeTruthy();
    expect(screen.getAllByText(/Apoderado · Ana/)).toHaveLength(2);
    fireEvent.click(screen.getByText('Colegio Santa Elena'));
    expect(onPick).toHaveBeenCalledWith(options[1]);
    fireEvent.click(screen.getByText('Usar otra cuenta'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('mientras entra a un colegio, los botones quedan deshabilitados', () => {
    render(<SchoolChooser options={options} onPick={vi.fn()} onCancel={vi.fn()} pendingSchoolId="s1|USER" />);
    const buttons = screen.getAllByRole('button').filter((b) => b.textContent?.includes('Apoderado'));
    expect(buttons.length).toBe(2);
    expect(buttons.every((b) => (b as HTMLButtonElement).disabled)).toBe(true);
  });
});
